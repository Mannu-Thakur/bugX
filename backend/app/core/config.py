from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Core ──────────────────────────────────────────────────────────────────
    ENV: str = "development"
    SECRET_KEY: str = "change-me-32-chars-min"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://xyz_platform:xyz_platform@localhost:5432/xyz_platform"
    )
    ALEMBIC_DATABASE_URL: str = (
        "postgresql+psycopg2://xyz_platform:xyz_platform@localhost:5432/xyz_platform"
    )

    # ── Cache / Queue ─────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Code Execution ────────────────────────────────────────────────────────
    JUDGE0_URL: str = "http://localhost:2358"
    USE_LOCAL_JUDGE: bool = True

    # ── API ───────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    )
    API_V1_PREFIX: str = "/api/v1"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ── OAuth Providers ───────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    # Dev-only convenience bypass — MUST be false in production
    ENABLE_MOCK_OAUTH: bool = False

    # ── URLs ──────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    MAX_SUBMISSIONS_PER_MINUTE: int = 10
    MAX_REQUESTS_PER_MINUTE_IP: int = 100
    # When True, rate limiter allows requests through if Redis is unreachable.
    # Set to False in production for strict enforcement.
    RATE_LIMIT_FAIL_OPEN: bool = True

    # ── Upload Limits ─────────────────────────────────────────────────────────
    MAX_SOURCE_BYTES: int = 65536
    MAX_AVATAR_BYTES: int = 5 * 1024 * 1024
    MAX_UPLOAD_BYTES: int = 25 * 1024 * 1024
    STORAGE_DIR: str = "storage"

    # ── Worker ────────────────────────────────────────────────────────────────
    RECLAIM_ALL_RUNNING_ON_START: bool = False

    # ── Problem Import ────────────────────────────────────────────────────────
    IMPORT_CACHE_TTL: int = 3600
    IMPORT_FAILURE_THRESHOLD: int = 3
    IMPORT_COOLDOWN_PERIOD: int = 30

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    # Supports any standard SMTP server (Gmail, Outlook, Zoho, SendGrid, AWS SES …)
    #
    # Gmail (App Password) example:
    #   SMTP_HOST=smtp.gmail.com  SMTP_PORT=587  SMTP_TLS=true  SMTP_SSL=false
    #   SMTP_USER=you@gmail.com   SMTP_PASSWORD=<16-char app password>
    #
    # SendGrid SMTP relay example:
    #   SMTP_HOST=smtp.sendgrid.net  SMTP_PORT=587  SMTP_USER=apikey
    #   SMTP_PASSWORD=<SendGrid API key>
    #
    # Leave blank to run without email (OTP shown in server logs + API response in dev).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # "Display Name <address@example.com>" — defaults to SMTP_USER when blank
    SMTP_FROM: str = ""
    # STARTTLS (recommended for port 587)
    SMTP_TLS: bool = True
    # Direct SSL (for port 465) — mutually exclusive with SMTP_TLS
    SMTP_SSL: bool = False

    # ── Computed Properties ───────────────────────────────────────────────────
    @property
    def is_development(self) -> bool:
        return self.ENV.lower() == "development"

    @property
    def smtp_configured(self) -> bool:
        """True when all mandatory SMTP fields are present."""
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.is_development and settings.SECRET_KEY == "change-me-32-chars-min":
        raise ValueError("SECRET_KEY must be set in production.")
    if not settings.is_development and settings.ENABLE_MOCK_OAUTH:
        raise ValueError("ENABLE_MOCK_OAUTH must be disabled in production.")
    if not settings.is_development and settings.USE_LOCAL_JUDGE:
        raise ValueError(
            "USE_LOCAL_JUDGE must be disabled in production — use a real Judge0 instance."
        )
    if not settings.is_development and settings.RATE_LIMIT_FAIL_OPEN:
        raise ValueError(
            "RATE_LIMIT_FAIL_OPEN must be False in production for strict enforcement."
        )
    return settings
