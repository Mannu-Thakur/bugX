from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    ENV: str = "development"
    SECRET_KEY: str = "change-me-32-chars-min"
    DATABASE_URL: str = (
        "postgresql+asyncpg://xyz_platform:xyz_platform@localhost:5432/xyz_platform"
    )
    ALEMBIC_DATABASE_URL: str = (
        "postgresql+psycopg2://xyz_platform:xyz_platform@localhost:5432/xyz_platform"
    )
    REDIS_URL: str = "redis://localhost:6379/0"
    JUDGE0_URL: str = "http://localhost:2358"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    API_V1_PREFIX: str = "/api/v1"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MAX_SUBMISSIONS_PER_MINUTE: int = 10
    MAX_REQUESTS_PER_MINUTE_IP: int = 100
    MAX_SOURCE_BYTES: int = 65536
    MAX_AVATAR_BYTES: int = 5 * 1024 * 1024
    MAX_UPLOAD_BYTES: int = 25 * 1024 * 1024
    STORAGE_DIR: str = "storage"
    RECLAIM_ALL_RUNNING_ON_START: bool = False

    @property
    def is_development(self) -> bool:
        return self.ENV.lower() == "development"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.is_development and settings.SECRET_KEY == "change-me-32-chars-min":
        raise ValueError("SECRET_KEY must be set outside development")
    return settings
