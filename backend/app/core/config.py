from functools import lru_cache

from pydantic import model_validator
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
        "postgresql+asyncpg://bugx:bugx@localhost:5432/bugx"
    )
    ALEMBIC_DATABASE_URL: str = (
        "postgresql+psycopg2://bugx:bugx@localhost:5432/bugx"
    )

    @staticmethod
    def _fix_db_url(url: str, async_driver: bool) -> str:
        """Render provides bare postgres:// URLs. Rewrite to the correct SQLAlchemy scheme."""
        if url.startswith("postgres://"):
            scheme = "postgresql+asyncpg://" if async_driver else "postgresql+psycopg2://"
            return scheme + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            scheme = "postgresql+asyncpg://" if async_driver else "postgresql+psycopg2://"
            return scheme + url[len("postgresql://"):]
        return url

    @model_validator(mode="after")
    def fix_database_urls(self) -> "Settings":
        self.DATABASE_URL = self._fix_db_url(self.DATABASE_URL, async_driver=True)
        self.ALEMBIC_DATABASE_URL = self._fix_db_url(self.ALEMBIC_DATABASE_URL, async_driver=False)
        return self


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

    # ── LAN Deployment ────────────────────────────────────────────────────────
    # Set to the host machine's LAN IP (e.g. 192.168.1.25) to allow other
    # devices on the same Wi-Fi to access the application.
    # The start-lan.ps1 script sets this automatically.
    LAN_HOST: str = ""

    # ── AI / LLM ──────────────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str = ""

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
    EMBEDDED_WORKERS: bool = True

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
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        # Dynamically add LAN origins when LAN_HOST is configured so that
        # browsers on the college Wi-Fi are not rejected by CORS.
        if self.LAN_HOST:
            lan_origins = [
                f"http://{self.LAN_HOST}",          # port 80 / Nginx (future)
                f"http://{self.LAN_HOST}:5174",     # Vite frontend (Docker host port)
                f"http://{self.LAN_HOST}:5173",     # Vite frontend (direct)
                f"http://{self.LAN_HOST}:8000",     # Backend direct (WebSocket)
            ]
            for o in lan_origins:
                if o not in origins:
                    origins.append(o)
        return origins

    @property
    def effective_frontend_url(self) -> str:
        """Returns the LAN-accessible frontend URL when LAN_HOST is set,
        otherwise falls back to the configured FRONTEND_URL.
        Used by OAuth callbacks to redirect to the correct origin."""
        if self.LAN_HOST:
            return f"http://{self.LAN_HOST}:5174"
        return self.FRONTEND_URL

    @property
    def effective_backend_url(self) -> str:
        """Returns the LAN-accessible backend URL when LAN_HOST is set,
        otherwise falls back to the configured BACKEND_URL.
        Used to build OAuth redirect URIs."""
        if self.LAN_HOST:
            return f"http://{self.LAN_HOST}:8000"
        return self.BACKEND_URL


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.is_development and settings.SECRET_KEY == "change-me-32-chars-min":
        raise ValueError("SECRET_KEY must be set in production.")
    if not settings.is_development and settings.ENABLE_MOCK_OAUTH:
        raise ValueError("ENABLE_MOCK_OAUTH must be disabled outside development.")
    if not settings.is_development and settings.USE_LOCAL_JUDGE:
        import warnings
        warnings.warn(
            "USE_LOCAL_JUDGE is enabled outside development. "
            "This uses subprocess execution with no sandboxing — acceptable for demos, "
            "but replace with a real Judge0 instance for public production use.",
            stacklevel=2,
        )
    if not settings.is_development and settings.RATE_LIMIT_FAIL_OPEN:
        raise ValueError(
            "RATE_LIMIT_FAIL_OPEN must be False outside development for strict enforcement."
        )
    return settings
