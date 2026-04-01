import json
from enum import Enum
from pydantic_ai import Agent
from app.llm.schemas import ExtractedStatement, build_classify_model

MODEL_MAP = {
    "claude": "anthropic:claude-opus-4-6",
    "openai": "openai:gpt-4o",
    "gemini": "google-gla:gemini-2.5-flash",
}


class AiProvider:
    """
    Provider class backed by pydantic-ai Agents with strict structured output.
    _extract_agent is built once at init (static schema).
    _classify_cache holds classify agents keyed by frozenset(categories + modes),
    built once per unique combination and reused across all import jobs.
    """

    _classify_cache: dict[frozenset, Agent] = {}

    def __init__(self, model: str):
        self._model = model
        self._extract_agent: Agent = Agent(
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

    def _get_classify_agent(self, categories: list[str], modes: list[str]) -> Agent:
        key = frozenset(categories + modes)
        if key not in AiProvider._classify_cache:
            CategoryEnum = Enum("CategoryEnum", {v: v for v in categories}, type=str)
            ModeEnum = Enum("ModeEnum", {v: v for v in modes}, type=str)
            classify_model = build_classify_model(CategoryEnum, ModeEnum)
            AiProvider._classify_cache[key] = Agent(
                self._model,
                result_type=classify_model,
                system_prompt=(
                    "You are a financial transaction classifier for Indian bank transactions. "
                    "For each input row, produce a ClassifiedTransaction using ONLY the exact enum values "
                    "defined in the schema for category and mode. "
                    "Return a JSON object with bank_name and transactions array."
                ),
            )
        return AiProvider._classify_cache[key]

    async def extract_rows(self, text: str, bank_hint: str | None = None) -> list:
        prompt = f"Bank hint: {bank_hint or 'Unknown Indian Bank'}\n\nExtract all transactions from this statement:\n\n{text}"
        result = await self._extract_agent.run(prompt)
        return result.data.rows

    async def map_rows(
        self,
        rows: list,
        categories: list[str],
        modes: list[str],
    ):
        agent = self._get_classify_agent(categories, modes)
        rows_json = json.dumps([r.model_dump(mode="json") for r in rows], indent=2)
        prompt = f"Classify these transactions:\n\n{rows_json}"
        result = await agent.run(prompt)
        return result.data
