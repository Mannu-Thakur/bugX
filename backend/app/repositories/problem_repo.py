"""Problem repository — DB queries for the problems catalog."""
import uuid
from typing import List, Optional

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.problem import Problem, problem_tags
from app.models.submission import Submission, SubmissionStatus
from app.models.tag import Tag
from app.models.test_case import TestCase
from app.models.problem_template import ProblemTemplate


class ProblemRepo:
    # ── List / detail queries ─────────────────────────────────────────────────

    @staticmethod
    async def list_problems(
        session: AsyncSession,
        *,
        page: int = 1,
        limit: int = 20,
        difficulty: Optional[str] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        sort: str = "title",
    ) -> tuple[List[Problem], int]:
        base = (
            select(Problem)
            .where(Problem.is_published == True)  # noqa: E712
            .options(selectinload(Problem.tags))
        )

        if difficulty:
            base = base.where(Problem.difficulty == difficulty)

        if tag:
            # Exact case-sensitive tag name match per spec
            tag_subq = select(problem_tags.c.problem_id).join(
                Tag, Tag.id == problem_tags.c.tag_id
            ).where(Tag.name == tag)
            base = base.where(Problem.id.in_(tag_subq))

        if search:
            base = base.where(
                or_(
                    Problem.title.ilike(f"%{search}%"),
                    Problem.slug.ilike(f"%{search}%"),
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await session.execute(count_stmt)).scalar() or 0

        difficulty_rank = case(
            (Problem.difficulty == "EASY", 1),
            (Problem.difficulty == "MEDIUM", 2),
            (Problem.difficulty == "HARD", 3),
            else_=4,
        )

        sort_orders = {
            "newest": (Problem.created_at.desc(), Problem.title.asc()),
            "oldest": (Problem.created_at.asc(), Problem.title.asc()),
            "title": (Problem.title.asc(),),
            "title_asc": (Problem.title.asc(),),
            "title_desc": (Problem.title.desc(),),
            "difficulty_asc": (difficulty_rank.asc(), Problem.title.asc()),
            "difficulty_desc": (difficulty_rank.desc(), Problem.title.asc()),
            "acceptance": (Problem.acceptance_rate.desc().nulls_last(), Problem.title.asc()),
            "acceptance_desc": (Problem.acceptance_rate.desc().nulls_last(), Problem.title.asc()),
            "acceptance_asc": (Problem.acceptance_rate.asc().nulls_last(), Problem.title.asc()),
        }
        base = base.order_by(*sort_orders.get(sort, sort_orders["newest"]))

        base = base.offset((page - 1) * limit).limit(limit)
        rows = list((await session.execute(base)).scalars().unique().all())
        return rows, total

    @staticmethod
    async def get_by_slug(session: AsyncSession, slug: str) -> Optional[Problem]:
        stmt = (
            select(Problem)
            .where(Problem.slug == slug)
            .options(
                selectinload(Problem.tags),
                selectinload(Problem.templates),
                selectinload(Problem.test_cases),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(session: AsyncSession, problem_id: uuid.UUID) -> Optional[Problem]:
        stmt = (
            select(Problem)
            .where(Problem.id == problem_id)
            .options(
                selectinload(Problem.tags),
                selectinload(Problem.templates),
                selectinload(Problem.test_cases),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_random_problem(
        session: AsyncSession,
        *,
        difficulty: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> Optional[Problem]:
        base = (
            select(Problem)
            .where(Problem.is_published == True)  # noqa: E712
            .options(
                selectinload(Problem.tags),
                selectinload(Problem.templates),
                selectinload(Problem.test_cases),
            )
        )

        if difficulty:
            base = base.where(Problem.difficulty == difficulty)

        if tag:
            # Exact case-sensitive tag name match per spec
            tag_subq = select(problem_tags.c.problem_id).join(
                Tag, Tag.id == problem_tags.c.tag_id
            ).where(Tag.name == tag)
            base = base.where(Problem.id.in_(tag_subq))

        stmt = base.order_by(func.random()).limit(1)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()


    # ── Admin create / update ─────────────────────────────────────────────────

    @staticmethod
    async def create(session: AsyncSession, problem: Problem) -> Problem:
        session.add(problem)
        await session.flush()
        return problem

    @staticmethod
    async def slug_exists(session: AsyncSession, slug: str) -> bool:
        stmt = select(func.count(Problem.id)).where(Problem.slug == slug)
        result = await session.execute(stmt)
        return (result.scalar() or 0) > 0

    @staticmethod
    async def get_tags_by_ids(session: AsyncSession, tag_ids: List[uuid.UUID]) -> List[Tag]:
        if not tag_ids:
            return []
        stmt = select(Tag).where(Tag.id.in_(tag_ids))
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_tag_by_name(session: AsyncSession, name: str) -> Optional[Tag]:
        stmt = select(Tag).where(Tag.name == name)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_tag(session: AsyncSession, name: str) -> Tag:
        tag = Tag(name=name)
        session.add(tag)
        await session.flush()
        return tag

    @staticmethod
    async def list_all_tags(session: AsyncSession) -> List[Tag]:
        stmt = select(Tag).order_by(Tag.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    # ── Acceptance rate (Phase 5) ─────────────────────────────────────────────

    @staticmethod
    async def update_acceptance_rate(session: AsyncSession, problem_id: uuid.UUID) -> None:
        ac_stmt = select(func.count(Submission.id)).where(
            Submission.problem_id == problem_id,
            Submission.status == SubmissionStatus.ACCEPTED,
            Submission.run_samples_only == False,  # noqa: E712
        )
        ac_count = (await session.execute(ac_stmt)).scalar() or 0

        total_stmt = select(func.count(Submission.id)).where(
            Submission.problem_id == problem_id,
            Submission.run_samples_only == False,  # noqa: E712
        )
        total_count = (await session.execute(total_stmt)).scalar() or 0

        acceptance_rate = round(100.0 * ac_count / total_count, 2) if total_count > 0 else None

        upd_stmt = (
            update(Problem)
            .where(Problem.id == problem_id)
            .values(acceptance_rate=acceptance_rate)
        )
        await session.execute(upd_stmt)

    # ── Best qualifying submission for user ────────────────────────────────────

    @staticmethod
    async def get_best_qualifying_submission(
        session: AsyncSession,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
    ) -> Optional[Submission]:
        stmt = (
            select(Submission)
            .where(
                Submission.user_id == user_id,
                Submission.problem_id == problem_id,
                Submission.status == SubmissionStatus.ACCEPTED,
                Submission.run_samples_only == False,  # noqa: E712
            )
            .order_by(Submission.score.desc(), Submission.created_at.asc())
            .limit(1)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    # ── Last submission for user ───────────────────────────────────────────────

    @staticmethod
    async def get_last_submission(
        session: AsyncSession,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
    ) -> Optional[Submission]:
        stmt = (
            select(Submission)
            .where(
                Submission.user_id == user_id,
                Submission.problem_id == problem_id,
                Submission.run_samples_only == False,  # noqa: E712
            )
            .order_by(Submission.created_at.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    # ── User status helpers ───────────────────────────────────────────────────

    @staticmethod
    async def get_user_status(
        session: AsyncSession,
        user_id: uuid.UUID,
        problem_id: uuid.UUID,
    ) -> dict:
        """Return {solved, best_score} for a user on a problem."""
        solved_stmt = select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.problem_id == problem_id,
            Submission.status == SubmissionStatus.ACCEPTED,
            Submission.run_samples_only == False,  # noqa: E712
        )
        solved_count = (await session.execute(solved_stmt)).scalar() or 0
        solved = solved_count > 0

        if solved:
            best_stmt = select(func.max(Submission.score)).where(
                Submission.user_id == user_id,
                Submission.problem_id == problem_id,
                Submission.status == SubmissionStatus.ACCEPTED,
                Submission.run_samples_only == False,  # noqa: E712
            )
            best_score_val = (await session.execute(best_stmt)).scalar()
            best_score = best_score_val if best_score_val and best_score_val > 0 else None
        else:
            best_score = None

        return {"solved": solved, "best_score": best_score}
