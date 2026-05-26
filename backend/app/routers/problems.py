from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query, Path, status

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_optional_user, require_admin, get_current_active_user
from app.models.user import User
from app.controllers.problem_controller import ProblemController
from app.schemas.problem import (
    ProblemListItem,
    ProblemDetail,
    PaginatedProblems,
    BestSubmissionResponse,
    ProblemCreate,
    ProblemUpdate,
    TagResponse
)

router = APIRouter()

# ── Public routes ───────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedProblems)
async def list_problems(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    difficulty: Optional[str] = Query(None, pattern="^(EASY|MEDIUM|HARD)$"),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query(
        "newest",
        pattern="^(newest|oldest|title|title_asc|title_desc|difficulty_asc|difficulty_desc|acceptance|acceptance_asc|acceptance_desc)$",
    ),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.list_problems(
        current_user=current_user,
        page=page,
        limit=limit,
        difficulty=difficulty,
        tag=tag,
        search=search,
        sort=sort
    )

@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.list_tags()

@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    name: str = Query(..., min_length=1, max_length=50),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.create_tag(name)

@router.get("/random", response_model=ProblemDetail)
async def get_random_problem(
    difficulty: Optional[str] = Query(None, pattern="^(EASY|MEDIUM|HARD)$"),
    tag: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_random_problem(
        current_user=current_user,
        difficulty=difficulty,
        tag=tag
    )

@router.get("/{slug}", response_model=ProblemDetail)
async def get_problem(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_problem(slug, current_user)


@router.get("/{slug}/submissions/best", response_model=BestSubmissionResponse)
async def get_best_submission(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_best_submission(slug, current_user)

from pydantic import BaseModel

class ProblemImportRequest(BaseModel):
    url_or_slug: str

@router.post("/import", response_model=ProblemDetail, status_code=status.HTTP_201_CREATED)
async def import_problem(
    req: ProblemImportRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    from app.services.leetcode_importer import LeetCodeImporter
    from app.services.google_importer import GoogleImporter
    try:
        url_or_slug = req.url_or_slug
        if url_or_slug.startswith("google:") or "google" in url_or_slug.lower():
            if url_or_slug.startswith("google:"):
                url_or_slug = url_or_slug[len("google:"):]
            problem = await GoogleImporter.resolve_and_import(db, url_or_slug)
        else:
            problem = await LeetCodeImporter.import_problem(db, url_or_slug)
            
        await db.commit()
        
        # Retrieve using controller to guarantee exact response format
        controller = ProblemController(db)
        return await controller.get_problem(problem.slug, current_user)
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"[ImportEndpoint] Failed to import problem: {e}")
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import problem: {str(e)}"
        )

# ── Admin routes ────────────────────────────────────────────────────────────

@router.post("", response_model=ProblemDetail, status_code=status.HTTP_201_CREATED)
async def create_problem(
    req: ProblemCreate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.create_problem(req)

@router.patch("/{slug}", response_model=ProblemDetail)
async def update_problem(
    req: ProblemUpdate,
    slug: str = Path(..., min_length=1, max_length=100),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.update_problem(slug, req)
