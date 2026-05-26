from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserFileResponse, UserProfile, UserUpdate
from app.services.upload_service import UploadedFilePayload
from app.services.user_service import UserService


class UserController:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

    async def update_me(self, current_user: User, req: UserUpdate) -> UserProfile:
        updated_user = await self.user_service.update_me(current_user, req)
        return UserProfile.model_validate(updated_user)

    async def upload_avatar(self, current_user: User, upload: UploadedFilePayload) -> UserProfile:
        updated_user = await self.user_service.save_avatar(current_user, upload)
        return UserProfile.model_validate(updated_user)

    async def list_my_files(self, current_user: User, subject: str | None = None) -> list[UserFileResponse]:
        return await self.user_service.list_files(current_user, subject)

    async def upload_my_file(self, current_user: User, subject: str, upload: UploadedFilePayload) -> UserFileResponse:
        return await self.user_service.save_file(current_user, subject, upload)

    async def delete_my_file(self, current_user: User, file_id):
        await self.user_service.delete_file(current_user, file_id)

    async def download_my_file(self, current_user: User, file_id):
        return await self.user_service.download_file(current_user, file_id)

    async def get_my_stats(self, current_user: User) -> dict:
        from app.repositories.user_stats_repo import UserStatsRepo
        repo = UserStatsRepo(self.db)
        stats = await repo.get_by_user_id(current_user.id)
        if not stats:
            return {
                "total_solved": 0, "easy_solved": 0, "medium_solved": 0, "hard_solved": 0,
                "total_score": 0, "current_streak": 0, "best_streak": 0,
                "last_active_date": None
            }
        return {
            "total_solved": stats.total_solved,
            "easy_solved": stats.easy_solved,
            "medium_solved": stats.medium_solved,
            "hard_solved": stats.hard_solved,
            "total_score": stats.total_score,
            "current_streak": stats.current_streak,
            "best_streak": stats.best_streak,
            "last_active_date": stats.last_active_date
        }

    async def get_my_submissions(self, current_user: User, page: int, limit: int) -> dict:
        from sqlalchemy import select, func
        from app.models.submission import Submission
        
        offset = (page - 1) * limit
        
        # count
        count_stmt = select(func.count(Submission.id)).where(Submission.user_id == current_user.id)
        total = (await self.db.execute(count_stmt)).scalar() or 0
        
        # rows
        stmt = (
            select(Submission)
            .where(Submission.user_id == current_user.id)
            .order_by(Submission.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        rows = list((await self.db.execute(stmt)).scalars().all())
        
        from app.schemas.submission import SubmissionResponse
        items = [SubmissionResponse.model_validate(row) for row in rows]
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if total > 0 else 0
        }
