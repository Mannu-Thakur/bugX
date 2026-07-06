import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.progress_repo import ProgressRepository
from app.models.user_progress import UserProblemProgress
from app.models.submission import Submission

class ProgressService:
    @staticmethod
    async def get_progress(session: AsyncSession, user_id: uuid.UUID, problem_id: uuid.UUID) -> UserProblemProgress | None:
        return await ProgressRepository.get_progress(session, user_id, problem_id)

    @staticmethod
    async def upsert_progress(
        session: AsyncSession,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
        solved: bool,
        submission: Submission
    ) -> UserProblemProgress:
        progress = await ProgressRepository.upsert_progress(session, user_id, problem_id, solved, submission)
        # Invalidate overview stats cache on solved status change
        from app.services.statistics_service import StatisticsService
        await StatisticsService.invalidate_overview_cache()
        return progress
