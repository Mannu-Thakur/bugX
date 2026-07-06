import uuid
import sqlalchemy as sa
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.company import Company
from app.models.problem import Problem, problem_companies
from app.models.topic import Topic
from app.models.problem import problem_topics

class CompanyRepository:
    @staticmethod
    async def list_companies(session: AsyncSession) -> list[dict]:
        stmt = (
            select(
                Company,
                func.count(Problem.id).label("total_problems"),
                func.sum(case((Problem.difficulty == "EASY", 1), else_=0)).label("easy_count"),
                func.sum(case((Problem.difficulty == "MEDIUM", 1), else_=0)).label("medium_count"),
                func.sum(case((Problem.difficulty == "HARD", 1), else_=0)).label("hard_count"),
            )
            .outerjoin(problem_companies, Company.id == problem_companies.c.company_id)
            .outerjoin(Problem, sa.and_(problem_companies.c.problem_id == Problem.id, Problem.is_published == True))
            .group_by(Company.id)
            .order_by(Company.name)
        )
        res = await session.execute(stmt)
        out = []
        for row in res.all():
            company, total, easy, med, hard = row
            out.append({
                "id": company.id,
                "name": company.name,
                "slug": company.slug,
                "logo_light": company.logo_light,
                "logo_dark": company.logo_dark,
                "brand_color": company.brand_color,
                "totalProblems": total or 0,
                "easyCount": easy or 0,
                "mediumCount": med or 0,
                "hardCount": hard or 0
            })
        return out

    @staticmethod
    async def get_by_slug(session: AsyncSession, slug: str) -> Company | None:
        stmt = select(Company).where(Company.slug == slug)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_company_stats(session: AsyncSession, company_id: uuid.UUID) -> dict:
        # Live difficulty breakdown for company
        diff_stmt = (
            select(
                func.count(Problem.id).label("total"),
                func.sum(case((Problem.difficulty == "EASY", 1), else_=0)).label("easy"),
                func.sum(case((Problem.difficulty == "MEDIUM", 1), else_=0)).label("medium"),
                func.sum(case((Problem.difficulty == "HARD", 1), else_=0)).label("hard")
            )
            .join(problem_companies, Problem.id == problem_companies.c.problem_id)
            .where(problem_companies.c.company_id == company_id, Problem.is_published == True)
        )
        diff_res = await session.execute(diff_stmt)
        diff_row = diff_res.first()
        total = diff_row.total if diff_row else 0
        easy = diff_row.easy if diff_row else 0
        medium = diff_row.medium if diff_row else 0
        hard = diff_row.hard if diff_row else 0

        # Topic distribution for company
        topic_stmt = (
            select(
                Topic.name,
                Topic.slug,
                func.count(Problem.id).label("count")
            )
            .join(problem_topics, Topic.id == problem_topics.c.topic_id)
            .join(Problem, problem_topics.c.problem_id == Problem.id)
            .join(problem_companies, Problem.id == problem_companies.c.problem_id)
            .where(problem_companies.c.company_id == company_id, Problem.is_published == True)
            .group_by(Topic.id)
            .order_by(sa.desc("count"))
        )
        topic_res = await session.execute(topic_stmt)
        topics = [{"name": r.name, "slug": r.slug, "count": r.count} for r in topic_res.all()]

        return {
            "totalProblems": total or 0,
            "easyCount": easy or 0,
            "mediumCount": medium or 0,
            "hardCount": hard or 0,
            "topics": topics
        }

    @staticmethod
    async def find_by_slug(session: AsyncSession, slug: str) -> Company | None:
        stmt = select(Company).where(Company.slug == slug)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def create(session: AsyncSession, company: Company) -> Company:
        session.add(company)
        await session.flush()
        return company
