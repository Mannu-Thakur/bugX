import uuid
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.submission import Submission, SubmissionStatus

class SubmissionRepo:
    @staticmethod
    async def create(
        session: AsyncSession,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
        language: str,
        source_code: str,
        run_samples_only: bool
    ) -> Submission:
        submission = Submission(
            user_id=user_id,
            problem_id=problem_id,
            language=language,
            source_code=source_code,
            run_samples_only=run_samples_only,
            status=SubmissionStatus.PENDING
        )
        session.add(submission)
        await session.flush()
        return submission

    @staticmethod
    async def get_by_id(session: AsyncSession, submission_id: uuid.UUID) -> Optional[Submission]:
        stmt = select(Submission).where(Submission.id == submission_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def set_status(
        session: AsyncSession, 
        submission_id: uuid.UUID, 
        from_status: SubmissionStatus, 
        to_status: SubmissionStatus
    ) -> bool:
        """Atomically set status to `to_status` only if current status is `from_status`."""
        stmt = (
            update(Submission)
            .where(Submission.id == submission_id, Submission.status == from_status)
            .values(status=to_status, updated_at=datetime.utcnow())
        )
        result = await session.execute(stmt)
        return result.rowcount > 0

    @staticmethod
    async def get_stale_running(session: AsyncSession, stale_threshold: datetime) -> List[Submission]:
        stmt = select(Submission).where(
            Submission.status == SubmissionStatus.RUNNING,
            Submission.updated_at < stale_threshold
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def reset_to_pending(session: AsyncSession, submission_id: uuid.UUID) -> None:
        """Used by worker reclaim to reset a stalled RUNNING row back to PENDING."""
        stmt = (
            update(Submission)
            .where(Submission.id == submission_id)
            .values(
                status=SubmissionStatus.PENDING,
                passed_count=0,
                total_count=0,
                passed_weight=0,
                total_weight=0,
                runtime_ms=None,
                memory_kb=None,
                error_message=None,
                updated_at=datetime.utcnow()
            )
        )
        await session.execute(stmt)
