import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.problem_repo import ProblemRepo
from app.repositories.user_stats_repo import UserStatsRepo

class StatsService:
    @staticmethod
    async def update_acceptance_rate(session: AsyncSession, problem_id: uuid.UUID) -> None:
        await ProblemRepo.update_acceptance_rate(session, problem_id)

    @staticmethod
    async def update_streak(session: AsyncSession, user_id: uuid.UUID) -> None:
        repo = UserStatsRepo(session)
        stats = await repo.lock_for_update(user_id)
        if not stats:
            return

        today = datetime.now(timezone.utc).date()
        
        if stats.last_active_date:
            diff = (today - stats.last_active_date).days
            if diff == 1:
                stats.current_streak += 1
            elif diff > 1:
                stats.current_streak = 1
            # if diff == 0, keep current streak
        else:
            stats.current_streak = 1
            
        stats.last_active_date = today
        if stats.current_streak > stats.best_streak:
            stats.best_streak = stats.current_streak
            
        # Session will commit these changes since the object was locked/retrieved
