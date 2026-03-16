from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://tracker:tracker_dev@localhost:5432/why_so_broke"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://tracker:tracker_dev@localhost:5432/why_so_broke"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30
    LLM_PROVIDER: Literal["claude", "openai", "gemini"] = "gemini"
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
