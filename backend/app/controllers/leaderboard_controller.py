from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from app.services.leaderboard_service import LeaderboardService

class LeaderboardController:
    @staticmethod
    async def get_leaderboard(session: AsyncSession, redis: Redis, period: str, limit: int = 50):
        service = LeaderboardService(redis)
        if period == "week":
            return await service.get_weekly_leaderboard(session, limit)
        return await service.get_all_time_leaderboard(session, limit)
