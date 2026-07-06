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
        """Recompute user_stats metrics (easy_solved, medium_solved, hard_solved, total_solved, total_score)
        idempotently from all qualifying bests.
        """
        from app.models.problem import Problem

        # Query unique solved problems for this user
        stmt = (
            select(Problem.id, Problem.difficulty)
            .join(Submission, Submission.problem_id == Problem.id)
            .where(
                Submission.user_id == user_id,
                Submission.status == SubmissionStatus.ACCEPTED,
                Submission.run_samples_only == False,  # noqa: E712
            )
            .distinct()
        )
        result = await self.session.execute(stmt)
        solved_problems = result.all()

        easy_count = 0
        medium_count = 0
        hard_count = 0

        for _, diff in solved_problems:
            diff_str = diff.value if hasattr(diff, "value") else str(diff)
            diff_str = diff_str.upper()
            if diff_str == "EASY":
                easy_count += 1
            elif diff_str == "MEDIUM":
                medium_count += 1
            elif diff_str == "HARD":
                hard_count += 1

        total_solved = easy_count + medium_count + hard_count
        total_score = (easy_count * 3) + (medium_count * 6) + (hard_count * 10)

        # Update user_stats in DB/session
        user_stats_stmt = select(UserStats).where(UserStats.user_id == user_id)
        user_stats_res = await self.session.execute(user_stats_stmt)
        user_stats = user_stats_res.scalar_one_or_none()

        if user_stats:
            user_stats.easy_solved = easy_count
            user_stats.medium_solved = medium_count
            user_stats.hard_solved = hard_count
            user_stats.total_solved = total_solved
            user_stats.total_score = total_score
        else:
            # Fallback if no user_stats row exists (should not happen normally)
            update_stmt = (
                update(UserStats)
                .where(UserStats.user_id == user_id)
                .values(
                    easy_solved=easy_count,
                    medium_solved=medium_count,
                    hard_solved=hard_count,
                    total_solved=total_solved,
                    total_score=total_score,
                )
            )
            await self.session.execute(update_stmt)

        return total_score
