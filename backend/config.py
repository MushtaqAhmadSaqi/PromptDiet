from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment or .env file."""

    environment: Literal["local", "production", "test"] = "local"
    port: int = 7860
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Database
    sqlite_path: str = "data/promptdiet.db"
    supabase_url: str | None = None
    supabase_key: str | None = None

    # Google Gemini API for Stage 3 declarative rewriter
    gemini_api_key: str | None = None

    # Pipeline tuning
    log_context_lines: int = 3
    cache_prefix_ratio: float = 0.2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

