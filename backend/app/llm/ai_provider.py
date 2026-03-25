import json
import os
from pydantic_ai import Agent
from app.llm.schemas import (
    ClassifiedStatement,
    ExtractedRow,
    ExtractedStatement,
)

MODEL_MAP = {
    "claude": "anthropic:claude-opus-4-6",
    "openai": "openai:gpt-4o",
    "gemini": "google-gla:gemini-2.5-flash",
}


class AiProvider:
    """
    Provider class backed by pydantic-ai Agents with strict structured output.
    """

    def __init__(self, model: str):
        self._model = model
        self._extract_agent: Agent[None, ExtractedStatement] = Agent(
            model,
            result_type=ExtractedStatement,
            system_prompt=(
                "You are a financial document parser specializing in Indian bank statements. "
                "Extract ALL transaction rows without any classification or categorisation. "
                "Do not skip, merge, or summarise any row. "
                "Return a JSON object with a 'rows' array containing all extracted transactions. "
                "Each row must have: date (YYYY-MM-DD), description (exact text), direction (debit/credit), amount (positive number), raw_text (original line)."
            ),
        )
        self._classify_agent: Agent[None, ClassifiedStatement] = Agent(
            model,
            result_type=ClassifiedStatement,
            system_prompt=(
                "You are a financial transaction classifier for Indian bank transactions. "
                "For each input row, produce a ClassifiedTransaction using the exact enum values "
                "defined in the schema for category and mode. "
                "Use CategoryEnum.OTHER when no category fits clearly. "
                "Return a JSON object with bank_name and transactions array."
            ),
        )

    async def extract_rows(self, text: str, bank_hint: str | None = None) -> list[ExtractedRow]:
        prompt = f"Bank hint: {bank_hint or 'Unknown Indian Bank'}\n\nExtract all transactions from this statement:\n\n{text}"
        result = await self._extract_agent.run(prompt)
        return result.data.rows

    async def map_rows(
        self,
        rows: list[ExtractedRow],
        categories: list[str],
        modes: list[str],
    ) -> ClassifiedStatement:
        rows_json = json.dumps([r.model_dump(mode="json") for r in rows], indent=2)
        prompt = f"Classify these transactions:\n\n{rows_json}"
        result = await self._classify_agent.run(prompt)
        return result.data
