from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.schemas.dynamic_cat import CompanyListItem, CompanyResponse
from app.services.company_service import CompanyService
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[CompanyListItem])
async def list_companies(
    db: AsyncSession = Depends(get_db)
):
    return await CompanyService.list_companies(db)

@router.get("/{slug}", response_model=CompanyResponse)
async def get_company(
    slug: str = Path(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    difficulty: Optional[str] = Query(None, pattern="^(EASY|MEDIUM|HARD)$"),
    search: Optional[str] = Query(None),
    sort: str = Query("title"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    detail = await CompanyService.get_company_detail(
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
            detail=f"Company with slug '{slug}' not found"
        )
    return detail
