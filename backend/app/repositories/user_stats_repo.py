import uuid
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_stats import UserStats
from app.models.submission import Submission, SubmissionStatus


class UserStatsRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_stats: UserStats) -> UserStats:
        self.session.add(user_stats)
        await self.session.flush()
        return user_stats

    async def get_by_user_id(self, user_id: uuid.UUID) -> UserStats | None:
        stmt = select(UserStats).where(UserStats.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def lock_for_update(self, user_id: uuid.UUID) -> UserStats | None:
        """SELECT ... FOR UPDATE — acquires a row lock. Returns the locked ORM object."""
        stmt = select(UserStats).where(UserStats.user_id == user_id).with_for_update()
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def has_prior_ac(self, user_id: uuid.UUID, problem_id: uuid.UUID) -> bool:
        """True if the user already has at least one qualifying AC for the problem."""
        stmt = select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.problem_id == problem_id,
            Submission.status == SubmissionStatus.ACCEPTED,
            Submission.run_samples_only == False,  # noqa: E712
        )
        result = await self.session.execute(stmt)
        return (result.scalar() or 0) > 0

    async def has_prior_ac_excluding(
        self,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
        exclude_submission_id: uuid.UUID,
    ) -> bool:
        """True if the user already had a qualifying AC *before* this submission.
        Excludes the current submission from the count so that the very first AC
        is not incorrectly detected as a 'prior' AC.
        """
        stmt = select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.problem_id == problem_id,
            Submission.status == SubmissionStatus.ACCEPTED,
            Submission.run_samples_only == False,  # noqa: E712
            Submission.id != exclude_submission_id,
        )
        result = await self.session.execute(stmt)
        return (result.scalar() or 0) > 0

    async def recompute_total_score(self, user_id: uuid.UUID) -> int:
        """Recompute user_stats.total_score as SUM of best qualifying score per problem.
        This is idempotent — safe to call multiple times.
        """
        subquery = (
            select(
                Submission.problem_id,
                func.max(Submission.score).label("best_score"),
            )
            .where(
                Submission.user_id == user_id,
                Submission.status == SubmissionStatus.ACCEPTED,
                Submission.run_samples_only == False,  # noqa: E712
            )
            .group_by(Submission.problem_id)
            .subquery()
        )

        stmt = select(func.coalesce(func.sum(subquery.c.best_score), 0))
        result = await self.session.execute(stmt)
        total = int(result.scalar() or 0)

        update_stmt = (
            update(UserStats)
            .where(UserStats.user_id == user_id)
            .values(total_score=total)
        )
        await self.session.execute(update_stmt)
        return total
