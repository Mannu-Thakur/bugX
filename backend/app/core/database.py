from collections.abc import AsyncGenerator
from pathlib import Path
import socket

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


FALLBACK_DB_PATH = Path(__file__).resolve().parents[2] / "sqlite_fallback.db"
FALLBACK_DB_URL = f"sqlite+aiosqlite:///{FALLBACK_DB_PATH.as_posix()}"

if is_postgres_reachable(settings.DATABASE_URL):
    db_url = settings.DATABASE_URL
    print("[Database] PostgreSQL is reachable. Using PostgreSQL.")
else:
    db_url = FALLBACK_DB_URL
    print("[Database] PostgreSQL is unreachable. Falling back to local SQLite.")

engine = create_async_engine(db_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
