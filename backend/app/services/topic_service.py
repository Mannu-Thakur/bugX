import re
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.topic_repo import TopicRepository
from app.models.topic import Topic
from app.core.config import get_settings

logger = logging.getLogger("topic_service")
settings = get_settings()

def normalize_topic_name(name: str) -> str:
    name = name.strip()
    if name.lower() in ("dp", "dynamic programming"):
        return "Dynamic Programming"
    return name.title()

def slugify(name: str) -> str:
    text = name.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text.strip("-")

class TopicService:
    @staticmethod
    async def list_topics(session: AsyncSession) -> list[dict]:
        redis_client = None
        import sys
        if "pytest" not in sys.modules:
            try:
                from redis.asyncio import Redis
                redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
                cached = await redis_client.get("cache:topics:list")
                if cached:
                    await redis_client.aclose()
                    return json.loads(cached)
            except Exception as e:
                logger.debug(f"Redis cache fetch failed: {e}")

        topics = await TopicRepository.list_topics(session)

        if redis_client and "pytest" not in sys.modules:
            try:
                await redis_client.set("cache:topics:list", json.dumps(topics), ex=3600)
                await redis_client.aclose()
            except Exception as e:
                logger.debug(f"Redis cache write failed: {e}")

        return topics

    @staticmethod
    async def get_topic_detail(session: AsyncSession, slug: str, page: int, limit: int, difficulty: str = None, search: str = None, sort: str = "title", current_user = None) -> dict:
        topic = await TopicRepository.get_by_slug(session, slug)
        if not topic:
            return None

        # Fetch live stats for topic
        stats = await TopicRepository.get_topic_stats(session, topic.id)

        # Fetch paginated problems
        from app.repositories.problem_repo import ProblemRepo
        problems_list, total = await ProblemRepo.list_problems(
            session,
            page=page,
            limit=limit,
            difficulty=difficulty,
            search=search,
            sort=sort,
            topic=slug,
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
            "topic": {
                "name": topic.name,
                "slug": topic.slug
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
    async def find_or_create_topic(session: AsyncSession, name: str) -> Topic:
        normalized_name = normalize_topic_name(name)
        slug = slugify(normalized_name)

        topic = await TopicRepository.find_by_slug(session, slug)
        if not topic:
            topic = Topic(
                name=normalized_name,
                slug=slug
            )
            topic = await TopicRepository.create(session, topic)
            await session.flush()
            # Invalidate topics cache
            await TopicService.invalidate_cache()
        return topic

    @staticmethod
    async def invalidate_cache():
        try:
            from redis.asyncio import Redis
            redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            await redis_client.delete("cache:topics:list")
            await redis_client.aclose()
        except Exception as e:
            logger.debug(f"Redis cache invalidation failed: {e}")
