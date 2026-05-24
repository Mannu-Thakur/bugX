from redis.asyncio import Redis
from redis.exceptions import RedisError


class RateLimitService:
    def __init__(self, redis_url: str) -> None:
        self.redis = Redis.from_url(redis_url, decode_responses=True)

    async def close(self) -> None:
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
                await self.redis.expire(key, window_seconds)
            return request_count <= max_requests
        except RedisError:
            # Keep the API usable during local Redis outages. Health still reports
            # Redis as degraded so the failure is visible.
            return True
