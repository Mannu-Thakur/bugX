import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_progress import UserProblemProgress
from app.models.submission import Submission

class ProgressRepository:
    @staticmethod
    async def get_progress(session: AsyncSession, user_id: uuid.UUID, problem_id: uuid.UUID) -> UserProblemProgress | None:
        stmt = select(UserProblemProgress).where(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.problem_id == problem_id
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def upsert_progress(
        session: AsyncSession,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
        solved: bool,
        submission: Submission
    ) -> UserProblemProgress:
        stmt = select(UserProblemProgress).where(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.problem_id == problem_id
        )
        res = await session.execute(stmt)
        progress = res.scalar_one_or_none()

        submitted_at = submission.created_at or datetime.now(timezone.utc)
        score = submission.score or 0

        if not progress:
            progress = UserProblemProgress(
                user_id=user_id,
                problem_id=problem_id,
                solved=solved,
                solved_at=submitted_at if solved else None,
                attempt_count=1,
                best_submission_id=submission.id if solved else None,
                best_score=score if solved else 0,
                last_attempted_at=submitted_at
            )
            session.add(progress)
        else:
            progress.attempt_count += 1
            progress.last_attempted_at = submitted_at
            if solved:
                if not progress.solved:
                    progress.solved = True
                    progress.solved_at = submitted_at
                
                # Check if this submission is the new best submission
                if score >= progress.best_score or progress.best_submission_id is None:
                    progress.best_submission_id = submission.id
                    progress.best_score = score

        await session.flush()
        return progress

    @staticmethod
    async def count_solved_by_user(session: AsyncSession, user_id: uuid.UUID) -> int:
        stmt = select(func.count(UserProblemProgress.id)).where(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.solved == True
        )
        res = await session.execute(stmt)
        return res.scalar() or 0
