import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.problem_repo import ProblemRepo
from app.repositories.user_stats_repo import UserStatsRepo
from app.models.user_stats import UserStats


class StatsService:
    @staticmethod
    async def update_acceptance_rate(session: AsyncSession, problem_id: uuid.UUID) -> None:
        """Recompute and persist acceptance_rate for a problem.
        Must be called inside an active transaction.
        """
        await ProblemRepo.update_acceptance_rate(session, problem_id)

    @staticmethod
    def update_streak_on_locked(user_stats: UserStats) -> None:
        """Update streak fields on an already-loaded (and locked) UserStats ORM object.
        Does NOT perform any additional DB queries. The caller must ensure user_stats
        was loaded with FOR UPDATE before calling this.
        """
        today = datetime.now(timezone.utc).date()

        if user_stats.last_active_date:
            diff = (today - user_stats.last_active_date).days
            if diff == 1:
                user_stats.current_streak += 1
            elif diff > 1:
                # Streak broken — reset to 1
                user_stats.current_streak = 1
            # diff == 0: same day, no change
        else:
            # First ever qualifying AC
            user_stats.current_streak = 1

        user_stats.last_active_date = today
        if user_stats.current_streak > user_stats.best_streak:
            user_stats.best_streak = user_stats.current_streak

    @staticmethod
    async def update_streak(session: AsyncSession, user_id: uuid.UUID) -> None:
        """Convenience method: lock and update streak.
        Prefer update_streak_on_locked when the row is already locked.
        """
        repo = UserStatsRepo(session)
        stats = await repo.lock_for_update(user_id)
        if stats is not None:
            StatsService.update_streak_on_locked(stats)
