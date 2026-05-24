from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.core.database import get_db
from app.controllers.leaderboard_controller import LeaderboardController

router = APIRouter()

def get_redis(request: Request) -> Redis:
    return request.app.state.rate_limit_service.redis

@router.get("/")
async def get_leaderboard(
    period: str = Query("all", pattern="^(all|week)$"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    return await LeaderboardController.get_leaderboard(db, redis, period, limit)
