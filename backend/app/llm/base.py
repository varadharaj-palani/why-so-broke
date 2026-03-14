from abc import ABC, abstractmethod
from app.llm.schemas import ParsedStatement


class LLMProvider(ABC):
    @abstractmethod
    async def parse_statement(self, text: str, bank_hint: str | None = None) -> ParsedStatement:
        """Parse bank statement text and return structured transactions."""
        ...
