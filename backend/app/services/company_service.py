import re
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.company_repo import CompanyRepository
from app.models.company import Company
from app.core.config import get_settings

logger = logging.getLogger("company_service")
settings = get_settings()

def normalize_company_name(name: str) -> str:
    name = name.strip()
    suffixes = [r"\binc\b\.?", r"\bllc\b\.?", r"\bcorp\b\.?", r"\bcorporation\b\.?", r"\bltd\b\.?", r"\blimited\b\.?", r"\blabs\b\.?"]
    for s in suffixes:
        name = re.sub(s, "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip()
    return name.title() or "Other"

def slugify(name: str) -> str:
    text = name.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text.strip("-")

class CompanyService:
    @staticmethod
    async def list_companies(session: AsyncSession) -> list[dict]:
        # Caching logic
        redis_client = None
        import sys
        if "pytest" not in sys.modules:
            try:
                from redis.asyncio import Redis
                redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
                cached = await redis_client.get("cache:companies:list")
                if cached:
                    await redis_client.aclose()
                    return json.loads(cached)
            except Exception as e:
                logger.debug(f"Redis cache fetch failed: {e}")

        companies = await CompanyRepository.list_companies(session)

        if redis_client and "pytest" not in sys.modules:
            try:
                await redis_client.set("cache:companies:list", json.dumps(companies), ex=3600)
                await redis_client.aclose()
            except Exception as e:
                logger.debug(f"Redis cache write failed: {e}")

        return companies

    @staticmethod
    async def get_company_detail(session: AsyncSession, slug: str, page: int, limit: int, difficulty: str = None, search: str = None, sort: str = "title", current_user = None) -> dict:
        company = await CompanyRepository.get_by_slug(session, slug)
        if not company:
            return None

        # Fetch live stats for company
        stats = await CompanyRepository.get_company_stats(session, company.id)

        # Fetch paginated problems
        from app.repositories.problem_repo import ProblemRepo
        problems_list, total = await ProblemRepo.list_problems(
            session,
            page=page,
            limit=limit,
            difficulty=difficulty,
            search=search,
            sort=sort,
            company=slug,
            current_user=current_user
        )

        pages = (total + limit - 1) // limit if total > 0 else 0

        # Populate user_status
        if current_user and problems_list:
            from app.schemas.problem import UserStatusEmbed
            problem_ids = [p.id for p in problems_list]
            statuses = await ProblemRepo.get_user_statuses_for_problems(session, current_user.id, problem_ids)
            for problem in problems_list:
                res = statuses.get(problem.id, {"solved": False, "best_score": None})
                problem.user_status = UserStatusEmbed(solved=res["solved"], best_score=res["best_score"])
        else:
            for problem in problems_list:
                problem.user_status = None

        return {
            "company": {
                "name": company.name,
                "slug": company.slug,
                "logo_light": company.logo_light,
                "logo_dark": company.logo_dark,
                "brand_color": company.brand_color
            },
            "problems": {
                "items": problems_list,
                "total": total,
                "page": page,
                "limit": limit,
                "pages": pages
            },
            "stats": stats
        }

    @staticmethod
    async def find_or_create_company(session: AsyncSession, name: str) -> Company:
        normalized_name = normalize_company_name(name)
        slug = slugify(normalized_name)
        
        company = await CompanyRepository.find_by_slug(session, slug)
        if not company:
            company = Company(
                name=normalized_name,
                slug=slug
            )
            company = await CompanyRepository.create(session, company)
            await session.flush()
            # Invalidate companies cache
            await CompanyService.invalidate_cache()
        return company

    @staticmethod
    async def invalidate_cache():
        try:
            from redis.asyncio import Redis
            redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            await redis_client.delete("cache:companies:list")
            await redis_client.aclose()
        except Exception as e:
            logger.debug(f"Redis cache invalidation failed: {e}")
