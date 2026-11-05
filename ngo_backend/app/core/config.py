"""
Application configuration management using Pydantic Settings.
Reads environment variables from system environment and local .env file.
"""

from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BASE_DIR / ".env"


class Settings(BaseSettings):
    # Application Info
    PROJECT_NAME: str = "OceanRescue NGO Conservation Operations Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Server Binding
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000

    # PostgreSQL Database URL (Configured in local .env; never store credentials in code)
    DATABASE_URL: str = "postgresql+psycopg2://postgres@localhost:5432/oceanrescue"

    # Connection Pool Settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # CORS Configuration
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # JWT & Authentication Settings (aligned with .env.example)
    JWT_SECRET_KEY: str = "oceanrescue-marine-tactical-secret-key-2026-auth-protection"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Uploads (anchored to backend directory for deterministic path resolution)
    UPLOAD_ROOT: Path = _BASE_DIR / "uploads"
    UPLOAD_DIR: Path = _BASE_DIR / "uploads" / "reports"
    MAX_UPLOAD_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB

    # YOLO Fishing Gear Detection Model Settings (models/best.pt)
    MODEL_PATH: Path = _BASE_DIR.parent / "models" / "best.pt"
    MODEL_NAME: str = "yolov8s-seg-trashcan"
    MODEL_DEVICE: str = "cpu"
    MODEL_CONFIDENCE_THRESHOLD: float = 0.25
    MODEL_IOU_THRESHOLD: float = 0.50
    MODEL_AGNOSTIC_NMS: bool = True
    MODEL_RETINA_MASKS: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
