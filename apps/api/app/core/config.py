from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_PATH = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(ROOT_ENV_PATH), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "LinguaAI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:3000"

    DATABASE_URL: str = "postgresql+asyncpg://lingua:lingua_secret@localhost:5432/linguaai"
    LOCAL_SQLITE_URL: str = "sqlite+aiosqlite:///./linguaai_dev.db"
    AUTO_FALLBACK_SQLITE: bool = True

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "linguaai-super-secret-jwt-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    LLM_PROVIDER: Literal["gemini", "openai", "adaptive_local"] = "gemini"
    VOICE_REALTIME_PROVIDER: Literal["gemini_live", "openai_realtime", "cascaded"] = "cascaded"
    PRONUNCIATION_PROVIDER: Literal["azure_speech", "acoustic_dsp"] = "acoustic_dsp"
    STT_PROVIDER: Literal["whisper", "deepgram", "browser_hybrid"] = "whisper"
    TTS_PROVIDER: Literal["edge_neural", "openai_tts", "elevenlabs"] = "edge_neural"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = "eastasia"
    ELEVENLABS_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""

    MAX_VOICE_SESSION_SECONDS: int = 900
    VOICE_CHUNK_MS: int = 100
    GATEKEEPER_PASS_THRESHOLD: float = 80.0


settings = Settings()
