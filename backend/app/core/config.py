"""
OceanRescue backend configuration.

Settings are read from environment variables and an optional .env file.
Never commit .env to source control; use .env.example for placeholders only.
"""
from __future__ import annotations
from pathlib import Path

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    _HAS_SETTINGS = True
except ImportError:          # pydantic_settings not installed
    from pydantic import BaseSettings  # type: ignore[assignment]
    SettingsConfigDict = None
    _HAS_SETTINGS = False

# Resolve project root: backend/app/core/config.py -> parents[3] = project root
_HERE = Path(__file__).resolve()
_PROJECT_ROOT = _HERE.parents[3]   # ocean rescue dataset/


class Settings(BaseSettings):
    """Application-wide settings."""

    if _HAS_SETTINGS and SettingsConfigDict is not None:
        model_config = SettingsConfigDict(
            env_file=str(_PROJECT_ROOT / ".env"),
            env_file_encoding="utf-8",
            case_sensitive=False,
            extra="ignore",
        )

    # Application
    app_name: str = "OceanRescue API"
    app_version: str = "0.1.0"
    debug: bool = False

    # CORS  -- comma-separated; restrict in production
    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    # Upload limits
    max_upload_bytes: int = 20 * 1024 * 1024   # 20 MB

    # Inference
    model_confidence_threshold: float = 0.25
    model_iou_threshold: float = 0.45
    model_device: str = "cpu"   # "cpu" or "cuda"

    # Computed helpers (not env vars)
    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def project_root(self) -> Path:
        return _PROJECT_ROOT

    @property
    def model_path(self) -> Path:
        return _PROJECT_ROOT / "models" / "best.pt"

    @property
    def allowed_image_content_types(self) -> list[str]:
        return ["image/jpeg", "image/png", "image/webp"]

    @property
    def allowed_image_extensions(self) -> list[str]:
        return [".jpg", ".jpeg", ".png", ".webp"]


# Singleton — import this object everywhere
settings = Settings()
