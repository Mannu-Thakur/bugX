import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.controllers.user_controller import UserController
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserFileResponse, UserProfile, UserUpdate
from app.services.upload_service import read_multipart_file

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


@router.post("/me/avatar", response_model=UserProfile)
async def upload_avatar(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    settings = get_settings()
    upload = await read_multipart_file(request, field_name="file", max_bytes=settings.MAX_AVATAR_BYTES)
    controller = UserController(db)
    return await controller.upload_avatar(current_user, upload)


@router.get("/me/files", response_model=list[UserFileResponse])
async def list_my_files(
    subject: str | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    controller = UserController(db)
    return await controller.list_my_files(current_user, subject)


@router.post("/me/files", response_model=UserFileResponse)
async def upload_my_file(
    request: Request,
    subject: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    settings = get_settings()
    upload = await read_multipart_file(request, field_name="file", max_bytes=settings.MAX_UPLOAD_BYTES)
    controller = UserController(db)
    return await controller.upload_my_file(current_user, subject, upload)


@router.delete("/me/files/{file_id}", status_code=204)
async def delete_my_file(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    controller = UserController(db)
    await controller.delete_my_file(current_user, file_id)
    return Response(status_code=204)


@router.get("/me/files/{file_id}/download")
async def download_my_file(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    controller = UserController(db)
    return await controller.download_my_file(current_user, file_id)


@router.get("/me/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    controller = UserController(db)
    return await controller.get_my_stats(current_user)

@router.get("/me/submissions")
async def get_my_submissions(
    page: int = 1,
    limit: int = 20,
    problem_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    controller = UserController(db)
    return await controller.get_my_submissions(current_user, page, limit, problem_id)


@router.get("/profile/{username}")
async def get_public_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    from app.repositories.user_repo import UserRepo
    from fastapi import HTTPException
    
    repo = UserRepo(db)
    user = await repo.get_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    controller = UserController(db)
    stats = await controller.get_my_stats(user)
    submissions = await controller.get_my_submissions(user, page=1, limit=10)
    
    return {
        "user": {
            "username": user.username,
            "fullName": user.full_name,
            "bio": user.bio,
            "location": user.location,
            "avatarUrl": user.avatar_url,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "leetcodeUrl": user.leetcode_url,
            "githubUrl": user.github_url,
            "linkedinUrl": user.linkedin_url,
            "portfolioUrl": user.portfolio_url,
        },
        "stats": stats,
        "submissions": submissions["items"]
    }

