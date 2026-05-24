import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from app.models.submission import Submission, SubmissionStatus
from app.models.problem import Problem, DifficultyEnum
from app.repositories.submission_repo import SubmissionRepo
from app.repositories.user_stats_repo import UserStatsRepo
from app.services.stats_service import StatsService

logger = logging.getLogger("scoring_service")


class ScoringService:
    def __init__(self, redis: Redis):
        self.redis = redis

    @staticmethod
    def calculate_score(
        status: str,
        passed_weight: int,
        total_weight: int,
        runtime_ms: int | None,
        time_limit_ms: int,
        score_base: int,
        bonus_max: int,
    ) -> int:
        if status != "ACCEPTED" or passed_weight < total_weight or total_weight == 0:
            return 0
        if score_base <= 0 or bonus_max < 0 or time_limit_ms <= 0:
            raise ValueError("Invalid scoring configuration")
        base = score_base
        if runtime_ms is None:
            return base
        ratio = min(runtime_ms / time_limit_ms, 1.0)
        bonus = int(bonus_max * (1 - ratio))
        return min(base + bonus, score_base + bonus_max)

    async def on_submission_complete(self, session: AsyncSession, submission: Submission) -> None:
        if submission.run_samples_only:
            return

        # Fetch problem scoring configuration
        problem_stmt = select(Problem).where(Problem.id == submission.problem_id)
        result = await session.execute(problem_stmt)
        problem = result.scalar_one_or_none()
        if not problem:
            logger.error(f"Problem {submission.problem_id} not found for scoring")
            return

        score = self.calculate_score(
            status=submission.status.value,
            passed_weight=submission.passed_weight,
            total_weight=submission.total_weight,
            runtime_ms=submission.runtime_ms,
            time_limit_ms=problem.time_limit_ms,
            score_base=problem.score_base,
            bonus_max=problem.runtime_bonus_max,
        )

        # Run all stat updates in a nested savepoint transaction
        async with session.begin_nested():
            # 1. Persist score on submission
            await SubmissionRepo.set_score(session, submission.id, score)

            if submission.status == SubmissionStatus.ACCEPTED:
                stats_repo = UserStatsRepo(session)

                # Lock the user_stats row for this user — must happen FIRST
                user_stats = await stats_repo.lock_for_update(submission.user_id)

                if user_stats is not None:
                    # Check for a PRIOR qualifying AC for this problem (excluding current submission)
                    had_prior_ac = await stats_repo.has_prior_ac_excluding(
                        submission.user_id, submission.problem_id, submission.id
                    )

                    # Increment solve counts only on first AC for this problem
                    if not had_prior_ac:
                        user_stats.total_solved += 1
                        if problem.difficulty == DifficultyEnum.EASY:
                            user_stats.easy_solved += 1
                        elif problem.difficulty == DifficultyEnum.MEDIUM:
                            user_stats.medium_solved += 1
                        elif problem.difficulty == DifficultyEnum.HARD:
                            user_stats.hard_solved += 1

                    # Recompute total_score idempotently from all qualifying bests
                    await stats_repo.recompute_total_score(submission.user_id)

                    # Update streak
                    await StatsService.update_streak_on_locked(user_stats)

            # 2. Update acceptance rate for every full (non-sample) submit
            await StatsService.update_acceptance_rate(session, submission.problem_id)

        # After DB transaction committed, clear leaderboard cache
        try:
            await self.redis.delete("leaderboard:all", "leaderboard:week")
        except Exception as e:
            logger.error(f"Redis cache invalidation failed: {e}")
