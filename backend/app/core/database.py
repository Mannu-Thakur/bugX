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
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()

def is_postgres_reachable(db_url: str) -> bool:
    # Extract host and port
    host = "localhost"
    port = 5432
    try:
        if "@" in db_url:
            netloc = db_url.split("@")[1].split("/")[0]
            if ":" in netloc:
                host, port_str = netloc.split(":")
                port = int(port_str)
            else:
                host = netloc
    except Exception:
        pass
        
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

if IS_TESTING:
    db_url = settings.DATABASE_URL
    logger.info("[Database] Testing environment detected. Using database URL: %s", db_url)
else:
    if not settings.DATABASE_URL.startswith("postgresql"):
        raise ValueError(f"Only PostgreSQL is allowed in production/development runtime. Found: {settings.DATABASE_URL}")

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
