from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user_repo import UserRepo
from app.schemas.user import UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepo(db)

    async def update_me(self, current_user: User, req: UserUpdate) -> User:
        if req.username is not None and req.username != current_user.username:
            existing = await self.user_repo.get_by_username(req.username)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="USERNAME_TAKEN"
                )
            current_user.username = req.username

        if req.avatar_url is not ... and req.avatar_url != current_user.avatar_url:
            current_user.avatar_url = req.avatar_url

        self.db.add(current_user)
        await self.db.commit()
        await self.db.refresh(current_user)

        return current_user
