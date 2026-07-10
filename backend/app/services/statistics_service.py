import json
import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.statistics_repo import StatisticsRepository
from app.core.config import get_settings

logger = logging.getLogger("statistics_service")
settings = get_settings()

class StatisticsService:
    @staticmethod
    async def get_overview(session: AsyncSession, user_id: uuid.UUID | None = None) -> dict:
        # Caching logic
        redis_client = None
        cache_key = "cache:stats:overview"
        if user_id:
            cache_key = f"cache:stats:overview:{user_id}"

        import sys
        if "pytest" not in sys.modules:
            try:
                from redis.asyncio import Redis
                redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
                cached = await redis_client.get(cache_key)
                if cached:
                    await redis_client.aclose()
                    parsed = json.loads(cached)
                    return parsed
            except Exception as e:
                logger.debug(f"Redis stats cache fetch failed: {e}")

        stats = await StatisticsRepository.get_overview(session, user_id)

        # Convert recentProblems (orm objects) to dicts for JSON serialization
        recent_problems_dict = []
        for p in stats["recentProblems"]:
            tags_list = [{"id": str(t.id), "name": t.name} for t in p.tags]
            recent_problems_dict.append({
                "id": str(p.id),
                "slug": p.slug,
                "title": p.title,
                "difficulty": p.difficulty.value if hasattr(p.difficulty, "value") else str(p.difficulty),
                "acceptance_rate": p.acceptance_rate,
                "score_base": p.score_base,
                "tags": tags_list,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "source": p.source
            })
        stats["recentProblems"] = recent_problems_dict

        if redis_client and "pytest" not in sys.modules:
            try:
                await redis_client.set(cache_key, json.dumps(stats), ex=3600)
                await redis_client.aclose()
            except Exception as e:
                logger.debug(f"Redis stats cache write failed: {e}")

        return stats

    @staticmethod
    async def invalidate_overview_cache(user_id: uuid.UUID | None = None):
        try:
            from redis.asyncio import Redis
            redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            await redis_client.delete("cache:stats:overview")
            if user_id:
                await redis_client.delete(f"cache:stats:overview:{user_id}")
            else:
                # Optionally delete all user-specific overview cache keys
                # Using keys/scan pattern
                async for key in redis_client.scan_iter("cache:stats:overview:*"):
                    await redis_client.delete(key)
            await redis_client.aclose()
        except Exception as e:
            logger.debug(f"Redis stats cache invalidation failed: {e}")
