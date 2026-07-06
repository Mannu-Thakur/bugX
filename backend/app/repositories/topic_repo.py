import uuid
import sqlalchemy as sa
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.topic import Topic
from app.models.problem import Problem, problem_topics

class TopicRepository:
    @staticmethod
    async def list_topics(session: AsyncSession) -> list[dict]:
        stmt = (
            select(
                Topic,
                func.count(Problem.id).label("total_problems"),
                func.sum(case((Problem.difficulty == "EASY", 1), else_=0)).label("easy_count"),
                func.sum(case((Problem.difficulty == "MEDIUM", 1), else_=0)).label("medium_count"),
                func.sum(case((Problem.difficulty == "HARD", 1), else_=0)).label("hard_count"),
            )
            .outerjoin(problem_topics, Topic.id == problem_topics.c.topic_id)
            .outerjoin(Problem, sa.and_(problem_topics.c.problem_id == Problem.id, Problem.is_published == True))
            .group_by(Topic.id)
            .order_by(Topic.name)
        )
        res = await session.execute(stmt)
        out = []
        for row in res.all():
            topic, total, easy, med, hard = row
            out.append({
                "id": topic.id,
                "name": topic.name,
                "slug": topic.slug,
                "totalProblems": total or 0,
                "easyCount": easy or 0,
                "mediumCount": med or 0,
                "hardCount": hard or 0
            })
        return out

    @staticmethod
    async def get_by_slug(session: AsyncSession, slug: str) -> Topic | None:
        stmt = select(Topic).where(Topic.slug == slug)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_topic_stats(session: AsyncSession, topic_id: uuid.UUID) -> dict:
        stmt = (
            select(
                func.count(Problem.id).label("total"),
                func.sum(case((Problem.difficulty == "EASY", 1), else_=0)).label("easy"),
                func.sum(case((Problem.difficulty == "MEDIUM", 1), else_=0)).label("medium"),
                func.sum(case((Problem.difficulty == "HARD", 1), else_=0)).label("hard")
            )
            .join(problem_topics, Problem.id == problem_topics.c.problem_id)
            .where(problem_topics.c.topic_id == topic_id, Problem.is_published == True)
        )
        res = await session.execute(stmt)
        row = res.first()
        total = row.total if row else 0
        easy = row.easy if row else 0
        medium = row.medium if row else 0
        hard = row.hard if row else 0

        return {
            "totalProblems": total or 0,
            "easyCount": easy or 0,
            "mediumCount": medium or 0,
            "hardCount": hard or 0
        }

    @staticmethod
    async def find_by_slug(session: AsyncSession, slug: str) -> Topic | None:
        stmt = select(Topic).where(Topic.slug == slug)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def create(session: AsyncSession, topic: Topic) -> Topic:
        session.add(topic)
        await session.flush()
        return topic
