from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate
from app.services.user_service import UserService


class UserController:
    def __init__(self, db: AsyncSession):
        self.user_service = UserService(db)

    async def update_me(self, current_user: User, req: UserUpdate) -> UserProfile:
        updated_user = await self.user_service.update_me(current_user, req)
        return UserProfile.model_validate(updated_user)
