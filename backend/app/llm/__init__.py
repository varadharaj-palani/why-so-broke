from app.llm.ai_provider import AiProvider, MODEL_MAP
from app.config import settings


def get_llm_provider() -> AiProvider:
    model = MODEL_MAP.get(settings.LLM_PROVIDER, "anthropic:claude-opus-4-6")
    return AiProvider(model)
