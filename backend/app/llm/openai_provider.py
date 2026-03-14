import asyncio
import json
from openai import AsyncOpenAI
from app.llm.base import LLMProvider
from app.llm.schemas import ParsedStatement, ParsedTransaction
from app.llm.claude_provider import SYSTEM_PROMPT
from app.constants import CATEGORIES, MODES
from app.config import settings


class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def parse_statement(self, text: str, bank_hint: str | None = None) -> ParsedStatement:
        system = SYSTEM_PROMPT.format(
            categories=", ".join(CATEGORIES),
            modes=", ".join(MODES),
        ) + f"\n\nBank: {bank_hint or 'Unknown Indian Bank'}"

        last_error = None
        for attempt in range(3):
            try:
                response = await self.client.chat.completions.create(
                    model="gpt-4o",
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": f"Parse this bank statement:\n\n{text}"},
                    ],
                    timeout=30,
                )
                content = response.choices[0].message.content
                data = json.loads(content)

                validated = []
                for t in data.get("transactions", []):
                    if t.get("category") not in CATEGORIES:
                        t["category"] = "Other"
                        t["confidence"] = min(t.get("confidence", 0.5), 0.3)
                    if t.get("mode") not in MODES:
                        t["mode"] = "UPI"
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

        raise RuntimeError(f"OpenAI parsing failed: {last_error}")
