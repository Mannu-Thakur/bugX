import asyncio

from fastapi import APIRouter, Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import AsyncSessionLocal
from app.core.config import get_settings
from app.services.judge0_client import Judge0Client

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict[str, str]:
    db_status = await _check_database()
    redis_status = await _check_redis(request)
    judge0_status = await _check_judge0()
    
    # "Backend Core" means the API can serve data. Redis/Judge0 are still
    # reported separately because they affect submissions, not catalog access.
    overall = "ok" if db_status == "ok" else "degraded"

    return {
        "status": overall,
        "db": db_status,
        "redis": redis_status,
        "judge0": judge0_status,
    }


async def _check_database() -> str:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return "ok"
    except SQLAlchemyError:
        return "error"
    except OSError:
        return "error"


async def _check_redis(request: Request) -> str:
    rate_limiter = getattr(request.app.state, "rate_limit_service", None)
    if rate_limiter is None:
        return "error"

    try:
        await asyncio.wait_for(rate_limiter.ping(), timeout=0.5)
        return "ok"
    except Exception:
        return "error"


async def _check_judge0() -> str:
    settings = get_settings()
    if not settings.JUDGE0_URL:
        return "skipped"
    
    client = Judge0Client(settings.JUDGE0_URL)
    try:
        await asyncio.wait_for(client.get_about(), timeout=0.8)
        workers = await asyncio.wait_for(client.get_workers(), timeout=0.8)
        available = workers[0].get("available", 0) if workers else 0
        if available >= 1:
            return "ok"
        return "error"
    except Exception:
        return "error"
