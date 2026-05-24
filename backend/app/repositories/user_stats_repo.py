from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_stats import UserStats


class UserStatsRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_stats: UserStats) -> UserStats:
        self.session.add(user_stats)
        await self.session.flush()
        return user_stats
