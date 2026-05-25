from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate
from app.services.user_service import UserService


class UserController:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

    async def update_me(self, current_user: User, req: UserUpdate) -> UserProfile:
        updated_user = await self.user_service.update_me(current_user, req)
        return UserProfile.model_validate(updated_user)

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
