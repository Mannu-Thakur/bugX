from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.schemas.dynamic_cat import StatsOverview
from app.services.statistics_service import StatisticsService
from app.models.user import User

router = APIRouter()

@router.get("/overview", response_model=StatsOverview)
async def get_overview(
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return await StatisticsService.get_overview(db, user_id=user_id)
