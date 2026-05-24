"""
Test fixtures for the XYZ platform backend tests.
Uses an in-memory SQLite-compatible approach: we override the DB URL with a
test PostgreSQL database or use a fake async session.

For CI / local testing without a real DB, tests that require DB access should
be skipped or use a fixture that mocks the DB session.
"""
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import create_app


# ── In-memory SQLite engine for tests ────────────────────────────────────────
# SQLite does not support all PostgreSQL features (e.g. UUIDs, ENUMs), so
# integration tests that need full PG should set TEST_DATABASE_URL env var.
import os

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    # Fall back to an in-memory async SQLite for smoke/unit tests
    "sqlite+aiosqlite:///:memory:",
)

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in TEST_DATABASE_URL else None,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    """Create all tables before tests and drop them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db(setup_db) -> AsyncGenerator[AsyncSession, None]:
    """Provide a test DB session that is rolled back after each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async test HTTP client with the DB dependency overridden."""
    app = create_app()

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
