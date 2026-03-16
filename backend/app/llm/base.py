from abc import ABC, abstractmethod
from app.llm.schemas import ParsedStatement, RawRow


class LLMProvider(ABC):
    @abstractmethod
    async def extract_rows(self, text: str, bank_hint: str | None = None) -> list[RawRow]:
        """Phase 1: Extract raw transaction rows from bank statement text. No classification."""
        ...

    @abstractmethod
    async def map_rows(self, rows: list[RawRow], categories: list[str], modes: list[str]) -> ParsedStatement:
        """Phase 2: Classify extracted rows into typed transactions with category/mode."""
        ...
