import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.bookmark_repo import BookmarkRepository
from app.repositories.problem_repo import ProblemRepo
from app.services.statistics_service import StatisticsService

class BookmarkService:
    @staticmethod
    async def toggle_bookmark(session: AsyncSession, user_id: uuid.UUID, slug: str) -> dict:
        problem = await ProblemRepo.get_by_slug(session, slug)
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Problem with slug '{slug}' not found"
            )

        is_bookmarked = await BookmarkRepository.is_bookmarked(session, user_id, problem.id)
        if is_bookmarked:
            await BookmarkRepository.delete_bookmark(session, user_id, problem.id)
            bookmarked = False
        else:
            await BookmarkRepository.create_bookmark(session, user_id, problem.id)
            bookmarked = True

        # Invalidate stats cache for this user and overall
        await StatisticsService.invalidate_overview_cache(user_id)

        return {
            "status": "success",
            "bookmarked": bookmarked,
            "message": "Problem bookmarked successfully" if bookmarked else "Bookmark removed successfully"
        }
