import uuid
import sqlalchemy as sa
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem
from app.models.company import Company
from app.models.topic import Topic
from app.models.user_progress import UserProblemProgress, Bookmark
from app.models.problem import problem_companies, problem_topics

class StatisticsRepository:
    @staticmethod
    async def get_overview(session: AsyncSession, user_id: uuid.UUID | None = None) -> dict:
        # 1. Total Problems, Companies, Topics counts
        total_problems = (await session.execute(select(func.count(Problem.id)).where(Problem.is_published == True))).scalar() or 0
        total_companies = (await session.execute(select(func.count(Company.id)))).scalar() or 0
        total_topics = (await session.execute(select(func.count(Topic.id)))).scalar() or 0

        # 2. Solved and Bookmarked counts
        solved_count = 0
        bookmarked_count = 0
        if user_id:
            solved_count = (await session.execute(
                select(func.count(UserProblemProgress.id)).where(
                    UserProblemProgress.user_id == user_id,
                    UserProblemProgress.solved == True
                )
            )).scalar() or 0
            
            bookmarked_count = (await session.execute(
                select(func.count(Bookmark.id)).where(Bookmark.user_id == user_id)
            )).scalar() or 0

        # 3. Difficulty Distribution
        diff_stmt = (
            select(
                func.sum(case((Problem.difficulty == "EASY", 1), else_=0)).label("easy"),
                func.sum(case((Problem.difficulty == "MEDIUM", 1), else_=0)).label("medium"),
                func.sum(case((Problem.difficulty == "HARD", 1), else_=0)).label("hard")
            )
            .where(Problem.is_published == True)
        )
        diff_res = await session.execute(diff_stmt)
        diff_row = diff_res.first()
        difficulty_distribution = {
            "easy": (diff_row.easy if diff_row else 0) or 0,
            "medium": (diff_row.medium if diff_row else 0) or 0,
            "hard": (diff_row.hard if diff_row else 0) or 0
        }

        # 4. Source Distribution
        src_stmt = (
            select(Problem.source, func.count(Problem.id))
            .where(Problem.is_published == True)
            .group_by(Problem.source)
        )
        src_res = await session.execute(src_stmt)
        source_distribution = {}
        for row in src_res.all():
            src_name = row[0] or "local"
            source_distribution[src_name.lower()] = row[1] or 0

        # 5. Company Distribution (top 5 with slugs/names/counts)
        comp_stmt = (
            select(Company.name, Company.slug, func.count(Problem.id).label("count"))
            .join(problem_companies, Company.id == problem_companies.c.company_id)
            .join(Problem, problem_companies.c.problem_id == Problem.id)
            .where(Problem.is_published == True)
            .group_by(Company.id)
            .order_by(sa.desc("count"))
            .limit(10)
        )
        comp_res = await session.execute(comp_stmt)
        company_distribution = [{"name": r.name, "slug": r.slug, "count": r.count} for r in comp_res.all()]

        # 6. Topic Distribution (top 5 with slugs/names/counts)
        topic_stmt = (
            select(Topic.name, Topic.slug, func.count(Problem.id).label("count"))
            .join(problem_topics, Topic.id == problem_topics.c.topic_id)
            .join(Problem, problem_topics.c.problem_id == Problem.id)
            .where(Problem.is_published == True)
            .group_by(Topic.id)
            .order_by(sa.desc("count"))
            .limit(10)
        )
        topic_res = await session.execute(topic_stmt)
        topic_distribution = [{"name": r.name, "slug": r.slug, "count": r.count} for r in topic_res.all()]

        # 7. Recent Problems (latest 5 published)
        recent_stmt = (
            select(Problem)
            .where(Problem.is_published == True)
            .order_by(Problem.created_at.desc())
            .limit(5)
        )
        recent_res = await session.execute(recent_stmt)
        recent_problems = list(recent_res.scalars().all())

        return {
            "totalProblems": total_problems,
            "totalCompanies": total_companies,
            "totalTopics": total_topics,
            "solvedCount": solved_count,
            "bookmarkedCount": bookmarked_count,
            "difficultyDistribution": difficulty_distribution,
            "sourceDistribution": source_distribution,
            "companyDistribution": company_distribution,
            "topic_distribution": topic_distribution, # matching exact casing
            "recentProblems": recent_problems
        }
