from collections.abc import AsyncGenerator
from pathlib import Path
import logging
import socket
import sys
import os
import time

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

def is_postgres_reachable(db_url: str) -> bool:
    try:
        parsed_url = make_url(db_url)
        host = parsed_url.host or "localhost"
        port = parsed_url.port or 5432
    except Exception:
        return False
        
    try:
        with socket.create_connection((host, port), timeout=0.8):
            return True
    except Exception:
        return False


def wait_for_postgres(db_url: str, timeout: float = 15.0) -> bool:
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_postgres_reachable(db_url):
            return True
        time.sleep(1.0)
    return False


FALLBACK_DB_PATH = Path(__file__).resolve().parents[2] / "sqlite_fallback.db"
FALLBACK_DB_URL = f"sqlite+aiosqlite:///{FALLBACK_DB_PATH.as_posix()}"

# Detect if we are running in unit tests (e.g. pytest)
IS_TESTING = (
    "pytest" in sys.modules
    or os.getenv("TESTING") == "1"
    or "PYTEST_CURRENT_TEST" in os.environ
)
IS_ALEMBIC = "alembic" in " ".join(sys.argv).lower()

if IS_TESTING or IS_ALEMBIC:
    db_url = settings.DATABASE_URL
    logger.info("[Database] Testing or migration environment detected; using configured database.")
else:
    if not settings.DATABASE_URL.startswith("postgresql"):
        raise ValueError("Only PostgreSQL is allowed in production/development runtime.")

    logger.info("[Database] Waiting for PostgreSQL database to be reachable...")
    if not wait_for_postgres(settings.DATABASE_URL, timeout=15.0):
        raise ConnectionError("PostgreSQL database is unreachable. Failing fast.")

    db_url = settings.DATABASE_URL
    logger.info("[Database] PostgreSQL is reachable. Using PostgreSQL.")

engine = create_async_engine(db_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
