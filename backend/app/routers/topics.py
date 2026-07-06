from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.schemas.dynamic_cat import TopicListItem, TopicResponse
from app.services.topic_service import TopicService
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[TopicListItem])
async def list_topics(
    db: AsyncSession = Depends(get_db)
):
    return await TopicService.list_topics(db)

@router.get("/{slug}", response_model=TopicResponse)
async def get_topic(
    slug: str = Path(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    difficulty: Optional[str] = Query(None, pattern="^(EASY|MEDIUM|HARD)$"),
    search: Optional[str] = Query(None),
    sort: str = Query("title"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    detail = await TopicService.get_topic_detail(
        db,
        slug=slug,
        page=page,
        limit=limit,
        difficulty=difficulty,
        search=search,
        sort=sort,
        current_user=current_user
    )
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with slug '{slug}' not found"
        )
    return detail
