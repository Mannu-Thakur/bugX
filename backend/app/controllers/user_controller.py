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
        from app.models.submission import Submission
        from app.models.battle import Battle
        from app.models.battle_player import BattlePlayer
        from sqlalchemy import select, or_
        from collections import Counter
        from datetime import datetime, timedelta, timezone

        repo = UserStatsRepo(self.db)
        stats = await repo.get_by_user_id(current_user.id)

        # Query submission timestamps for the last year
        one_year_ago = datetime.now(timezone.utc) - timedelta(days=366)
        stmt = (
            select(Submission.created_at)
            .where(Submission.user_id == current_user.id)
            .where(Submission.created_at >= one_year_ago)
        )
        res = await self.db.execute(stmt)
        timestamps = res.scalars().all()
        activity = Counter(t.strftime("%Y-%m-%d") for t in timestamps if t)

        # Query battles played and won
        battle_stmt = (
            select(Battle)
            .join(Battle.players)
            .where(BattlePlayer.username == current_user.username)
        )
        battle_res = await self.db.execute(battle_stmt)
        battles = list(battle_res.scalars().all())

        battles_played = 0
        battles_won = 0
        for b in battles:
            if b.status == "finished" and b.players:
                battles_played += 1
                max_score = max(p.score for p in b.players)
                max_scorers = [p for p in b.players if p.score == max_score]
                if len(max_scorers) == 1:
                    if max_scorers[0].username == current_user.username:
                        battles_won += 1
                else:
                    solvers = [p for p in max_scorers if p.solved]
                    if solvers:
                        # Sort by solved_at (earliest first). Use aware helper or replace naive
                        def get_solved_at(p):
                            if p.solved_at is None:
                                return datetime.max.replace(tzinfo=timezone.utc)
                            if p.solved_at.tzinfo is None:
                                return p.solved_at.replace(tzinfo=timezone.utc)
                            return p.solved_at
                        solvers.sort(key=get_solved_at)
                        if solvers[0].username == current_user.username:
                            battles_won += 1

        if not stats:
            return {
                "total_solved": 0, "easy_solved": 0, "medium_solved": 0, "hard_solved": 0,
                "total_score": 0, "current_streak": 0, "best_streak": 0,
                "last_active_date": None,
                "submission_activity": dict(activity),
                "battles_played": battles_played,
                "battles_won": battles_won
            }
        return {
            "total_solved": stats.total_solved,
            "easy_solved": stats.easy_solved,
            "medium_solved": stats.medium_solved,
            "hard_solved": stats.hard_solved,
            "total_score": stats.total_score,
            "current_streak": stats.current_streak,
            "best_streak": stats.best_streak,
            "last_active_date": stats.last_active_date,
            "submission_activity": dict(activity),
            "battles_played": battles_played,
            "battles_won": battles_won
        }

    async def get_my_submissions(self, current_user: User, page: int, limit: int, problem_id = None) -> dict:
        from sqlalchemy import select, func
        from app.models.submission import Submission

        offset = (page - 1) * limit

        # count
        count_stmt = select(func.count(Submission.id)).where(Submission.user_id == current_user.id)
        if problem_id:
            count_stmt = count_stmt.where(Submission.problem_id == problem_id)
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # rows
        stmt = (
            select(Submission)
            .where(Submission.user_id == current_user.id)
            .order_by(Submission.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        if problem_id:
            stmt = stmt.where(Submission.problem_id == problem_id)
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
