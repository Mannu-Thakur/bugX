import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class RateLimitService:
    """
    Sliding-window rate limiter backed by Redis INCR + EXPIRE.

    Behaviour when Redis is unavailable:
      • is_development=True  → fail-open  (allow request through, log a warning)
      • is_development=False → fail-closed (deny request, return HTTP 429)

    This is overridable via the RATE_LIMIT_FAIL_OPEN env flag so staging
    environments can opt into lenient behaviour while keeping production strict.
    """

    def __init__(self, redis_url: str = None, redis_client: Redis = None) -> None:
        if redis_client is not None:
            self.redis = redis_client
            self._external_client = True
        else:
            self.redis = Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.2,
                retry_on_timeout=False,
            )
            self._external_client = False

    async def close(self) -> None:
        if not getattr(self, "_external_client", False):
            await self.redis.aclose()

    async def ping(self) -> bool:
        await self.redis.ping()
        return True

    async def check_ip(
        self,
        ip_address: str,
        max_requests: int,
        window_seconds: int = 60,
    ) -> bool:
        key = f"ratelimit:ip:{ip_address}"
        return await self._check_limit(key, max_requests, window_seconds)

    async def check_submit(
        self,
        user_id: str,
        max_requests: int,
        window_seconds: int = 60,
    ) -> bool:
        key = f"ratelimit:submit:{user_id}"
        return await self._check_limit(key, max_requests, window_seconds)

    async def _check_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> bool:
        try:
            request_count = await self.redis.incr(key)
            if request_count == 1:
                # First hit in this window — set the expiry
                await self.redis.expire(key, window_seconds)
            return request_count <= max_requests

        except RedisError as exc:
            return self._on_redis_failure(key, exc)

        except Exception as exc:
            return self._on_redis_failure(key, exc)

    def _on_redis_failure(self, key: str, exc: Exception) -> bool:
        """
        Decide whether to fail-open or fail-closed when Redis is unreachable.

        Reads RATE_LIMIT_FAIL_OPEN from settings at call time so the setting
        can be changed without a full restart (cache is per-process, not per-request).
        """
        from app.core.config import get_settings
        settings = get_settings()

        fail_open = settings.RATE_LIMIT_FAIL_OPEN

        logger.error(
            "[RateLimit] Redis unreachable for key=%s (%s). "
            "Failing %s (RATE_LIMIT_FAIL_OPEN=%s).",
            key, exc, "open — request allowed" if fail_open else "closed — request denied",
            fail_open,
        )

        # fail_open=True  → return True  (allow)
        # fail_open=False → return False (deny / 429)
        return fail_open
