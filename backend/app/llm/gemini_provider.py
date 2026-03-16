import asyncio
import json
from google import genai
from google.genai import types
from app.llm.base import LLMProvider
from app.llm.schemas import ParsedStatement, ParsedTransaction, RawRow
from app.llm.claude_provider import EXTRACT_SYSTEM_PROMPT, MAP_SYSTEM_PROMPT
from app.config import settings


class GeminiProvider(LLMProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-2.5-flash"

    async def extract_rows(self, text: str, bank_hint: str | None = None) -> list[RawRow]:
        system = EXTRACT_SYSTEM_PROMPT + f"\n\nBank: {bank_hint or 'Unknown Indian Bank'}"
        user_msg = f"Extract all transactions from this bank statement:\n\n{text}"
        last_error = None
        for attempt in range(3):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model,
                    contents=user_msg,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        response_mime_type="application/json",
                        max_output_tokens=8192,
                    ),
                )
                content = (response.text or "").strip()
                # Response may be a JSON array or wrapped object
                data = json.loads(content)
                if isinstance(data, list):
                    return [RawRow(**row) for row in data if isinstance(row, dict)]
                if isinstance(data, dict):
                    rows_data = data.get("rows", data.get("transactions", []))
                    return [RawRow(**row) for row in rows_data if isinstance(row, dict)]
                return []
            except Exception as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt * 2)
        raise RuntimeError(f"Gemini extraction failed after 3 attempts: {last_error}")

    async def map_rows(self, rows: list[RawRow], categories: list[str], modes: list[str]) -> ParsedStatement:
        system = MAP_SYSTEM_PROMPT.format(
            categories=", ".join(categories),
            modes=", ".join(modes),
        )
        rows_json = json.dumps([r.model_dump(mode="json") for r in rows], indent=2)
        user_msg = f"Classify these transactions:\n\n{rows_json}"
        last_error = None
        for attempt in range(3):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model,
                    contents=user_msg,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        response_mime_type="application/json",
                        max_output_tokens=8192,
                    ),
                )
                content = (response.text or "").strip()
                data = json.loads(content)
                validated = []
                for t in data.get("transactions", []):
                    if t.get("category") not in categories:
                        t["category"] = categories[-1] if categories else "Other"
                        t["confidence"] = min(t.get("confidence", 0.5), 0.3)
                    if t.get("mode") not in modes:
                        t["mode"] = modes[0] if modes else "UPI"
                        t["confidence"] = min(t.get("confidence", 0.5), 0.3)
                    try:
                        validated.append(ParsedTransaction(**t))
                    except Exception:
                        continue
                return ParsedStatement(bank_name=data.get("bank_name", ""), transactions=validated)
            except Exception as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt * 2)
        raise RuntimeError(f"Gemini mapping failed after 3 attempts: {last_error}")
