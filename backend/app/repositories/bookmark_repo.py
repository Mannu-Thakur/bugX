import uuid
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_progress import Bookmark

class BookmarkRepository:
    @staticmethod
    async def create_bookmark(session: AsyncSession, user_id: uuid.UUID, problem_id: uuid.UUID) -> Bookmark:
        # Check if already exists
        stmt = select(Bookmark).where(
            Bookmark.user_id == user_id,
            Bookmark.problem_id == problem_id
        )
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        bookmark = Bookmark(user_id=user_id, problem_id=problem_id)
        session.add(bookmark)
        await session.flush()
        return bookmark

    @staticmethod
    async def delete_bookmark(session: AsyncSession, user_id: uuid.UUID, problem_id: uuid.UUID) -> bool:
        stmt = delete(Bookmark).where(
            Bookmark.user_id == user_id,
            Bookmark.problem_id == problem_id
        )
        res = await session.execute(stmt)
        return (res.rowcount or 0) > 0

    @staticmethod
    async def is_bookmarked(session: AsyncSession, user_id: uuid.UUID, problem_id: uuid.UUID) -> bool:
        stmt = select(func.count(Bookmark.id)).where(
            Bookmark.user_id == user_id,
            Bookmark.problem_id == problem_id
        )
        res = await session.execute(stmt)
        return (res.scalar() or 0) > 0

    @staticmethod
    async def count_by_user(session: AsyncSession, user_id: uuid.UUID) -> int:
        stmt = select(func.count(Bookmark.id)).where(Bookmark.user_id == user_id)
        res = await session.execute(stmt)
        return res.scalar() or 0
