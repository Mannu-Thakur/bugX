"""
Daily Challenge router — /api/v1/daily

NON-BREAKING: New router added to app/main.py. Does NOT modify any existing router,
model, or migration. Uses only the existing `problems` table (read-only query).

Algorithm:
  - Fetch all published problems from DB
  - Sort by created_at (stable ordering)
  - Pick index = sha256(YYYY-MM-DD) % len(problems)
  - Same problem for all users on the same UTC day
  - Resets at UTC midnight automatically (no cron needed)
"""
import hashlib
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.problem import Problem
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User

router = APIRouter()


def _daily_index(problems_count: int) -> int:
    """Deterministic daily index — same result for every user on the same UTC day."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    digest = hashlib.sha256(today_str.encode()).hexdigest()
    return int(digest, 16) % problems_count


@router.get("/daily")
async def get_daily_challenge(db: AsyncSession = Depends(get_db)) -> Any:
    """
    Returns today's daily challenge problem (no auth required).
    Picks a deterministic problem from the published pool based on today's UTC date.
    """
    stmt = (
        select(Problem)
        .where(Problem.is_published == True)  # noqa: E712
        .order_by(Problem.created_at.asc())
    )
    result = await db.execute(stmt)
    problems = list(result.scalars().all())

    if not problems:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No published problems available for daily challenge")

    idx = _daily_index(len(problems))
    problem = problems[idx]

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return {
        "date": today_str,
        "problem": {
            "id": str(problem.id),
            "slug": problem.slug,
            "title": problem.title,
            "difficulty": problem.difficulty.value if hasattr(problem.difficulty, "value") else str(problem.difficulty),
            "acceptance_rate": problem.acceptance_rate,
            "score_base": problem.score_base,
            "tags": [{"id": str(t.id), "name": t.name} for t in (problem.tags or [])],
        },
        "pool_size": len(problems),
    }


@router.get("/daily/status")
async def get_daily_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Returns today's daily challenge + whether the current user has solved it today.
    Requires auth.
    """
    # Get today's problem
    stmt = (
        select(Problem)
        .where(Problem.is_published == True)  # noqa: E712
        .order_by(Problem.created_at.asc())
    )
    result = await db.execute(stmt)
    problems = list(result.scalars().all())

    if not problems:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No published problems available")

    idx = _daily_index(len(problems))
    problem = problems[idx]

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Check if user has an accepted submission on today's daily problem today
    solved_stmt = select(Submission).where(
        Submission.user_id == current_user.id,
        Submission.problem_id == problem.id,
        Submission.status == SubmissionStatus.ACCEPTED,
        Submission.run_samples_only == False,  # noqa: E712
        Submission.created_at >= today_start,
    ).limit(1)
    solved_result = await db.execute(solved_stmt)
    solved_today = solved_result.scalar_one_or_none() is not None

    # Check if user has EVER solved this problem (for "already solved" badge)
    ever_solved_stmt = select(Submission).where(
        Submission.user_id == current_user.id,
        Submission.problem_id == problem.id,
        Submission.status == SubmissionStatus.ACCEPTED,
        Submission.run_samples_only == False,  # noqa: E712
    ).limit(1)
    ever_solved_result = await db.execute(ever_solved_stmt)
    ever_solved = ever_solved_result.scalar_one_or_none() is not None

    return {
        "date": today_str,
        "solved_today": solved_today,
        "ever_solved": ever_solved,
        "problem": {
            "id": str(problem.id),
            "slug": problem.slug,
            "title": problem.title,
            "difficulty": problem.difficulty.value if hasattr(problem.difficulty, "value") else str(problem.difficulty),
            "acceptance_rate": problem.acceptance_rate,
            "score_base": problem.score_base,
            "tags": [{"id": str(t.id), "name": t.name} for t in (problem.tags or [])],
        },
        "pool_size": len(problems),
    }
