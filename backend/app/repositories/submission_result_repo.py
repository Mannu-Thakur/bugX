import uuid
from typing import List
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.submission_result import SubmissionResult

class SubmissionResultRepo:
    @staticmethod
    async def delete_by_submission_id(session: AsyncSession, submission_id: uuid.UUID) -> None:
        stmt = delete(SubmissionResult).where(SubmissionResult.submission_id == submission_id)
        await session.execute(stmt)

    @staticmethod
    async def bulk_insert(session: AsyncSession, results: List[SubmissionResult]) -> None:
        session.add_all(results)
        await session.flush()

    @staticmethod
    async def get_by_submission_id(session: AsyncSession, submission_id: uuid.UUID) -> List[SubmissionResult]:
        # Need to join with TestCase if we wanted to sort, but we usually fetch it ordered anyway or just return all
        stmt = select(SubmissionResult).where(SubmissionResult.submission_id == submission_id)
        result = await session.execute(stmt)
        return list(result.scalars().all())
