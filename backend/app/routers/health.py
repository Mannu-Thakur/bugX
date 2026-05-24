from fastapi import APIRouter, Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import AsyncSessionLocal

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict[str, str]:
    db_status = await _check_database()
    redis_status = await _check_redis(request)
    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return {
        "status": overall,
        "db": db_status,
        "redis": redis_status,
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
        await rate_limiter.ping()
        return "ok"
    except Exception:
        return "error"
