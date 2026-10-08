from functools import lru_cache
from datetime import time
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(min_length=1)
    database_schema: str = Field(default="student_attendance", pattern=r"^[A-Za-z_][A-Za-z0-9_]*$")
    secret_key: SecretStr = Field(min_length=32)
    access_token_expire_minutes: int = Field(default=60, gt=0, le=1440)
    login_max_failures: int = Field(default=5, gt=0)
    login_lockout_seconds: int = Field(default=900, gt=0)
    late_after_time: time = time(8, 0)
    school_settings_file: Path = Path("data/school-settings.json")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    app_name: str = "ប្រព័ន្ធគ្រប់គ្រងសិស្ស និងវត្តមាន"
    face_similarity_threshold: float = Field(default=0.363, gt=0, le=1)
    face_ambiguity_margin: float = Field(default=0.03, ge=0, le=0.2)
    max_upload_bytes: int = Field(default=5 * 1024 * 1024, gt=0)
    uploads_directory: Path = Path("uploads")
    face_models_directory: Path = Path("models")
    khmer_font_path: Path = Path("assets/NotoSansKhmer[wdth,wght].ttf")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
