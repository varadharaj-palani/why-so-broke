from app.llm.base import LLMProvider
from app.config import settings


def get_llm_provider() -> LLMProvider:
    if settings.LLM_PROVIDER == "claude":
        from app.llm.claude_provider import ClaudeProvider
        return ClaudeProvider()
    elif settings.LLM_PROVIDER == "openai":
        from app.llm.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif settings.LLM_PROVIDER == "gemini":
        from app.llm.gemini_provider import GeminiProvider
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")
