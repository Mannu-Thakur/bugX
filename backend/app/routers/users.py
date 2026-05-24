from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.user_controller import UserController
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_active_user)) -> Any:
    return UserProfile.model_validate(current_user)


@router.patch("/me", response_model=UserProfile)
async def update_me(
    req: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    controller = UserController(db)
    return await controller.update_me(current_user, req)
