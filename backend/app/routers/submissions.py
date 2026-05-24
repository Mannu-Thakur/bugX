from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse, SubmissionResultResponse
from app.controllers.submission_controller import SubmissionController
import redis.asyncio as aioredis
from app.core.config import get_settings

router = APIRouter(prefix="/submissions", tags=["Submissions"])

async def get_redis():
    settings = get_settings()
    redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.aclose()

@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_submission(
    payload: SubmissionCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis)
):
    return await SubmissionController.create(db, redis, user, payload)

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    return await SubmissionController.get_by_id(db, submission_id, user)

@router.get("/{submission_id}/results", response_model=List[SubmissionResultResponse])
async def get_submission_results(
    submission_id: UUID,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    return await SubmissionController.get_results(db, submission_id, user)
