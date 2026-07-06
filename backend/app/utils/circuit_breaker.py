import time
import logging
from redis.asyncio import Redis
from redis.exceptions import RedisError
from app.core.config import get_settings

logger = logging.getLogger("circuit_breaker")

class RedisCircuitBreaker:
    _local_state = {}  # Fallback in-memory state dictionary

    def __init__(
        self,
        provider: str,
        failure_threshold: int = None,
        cooldown_period: int = None,
        redis_client: Redis = None
    ):
        settings = get_settings()
        self.provider = provider.lower()
        self.failure_threshold = failure_threshold or settings.IMPORT_FAILURE_THRESHOLD
        self.cooldown_period = cooldown_period or settings.IMPORT_COOLDOWN_PERIOD
        
        if redis_client is not None:
            self.redis = redis_client
            self._owns_redis = False
        else:
            self.redis = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
            )
            self._owns_redis = True

    async def _close_redis(self):
        if self._owns_redis and self.redis:
            try:
                await self.redis.aclose()
            except Exception:
                pass

    async def get_state(self) -> str:
        """
        Retrieves the state of the circuit breaker: CLOSED, OPEN, or HALF-OPEN.
        """
        try:
            state = await self.redis.get(f"circuit_breaker:{self.provider}:state")
            if state:
                return state
            return "CLOSED"
        except (RedisError, Exception) as redis_err:
            logger.warning(f"Redis error getting circuit breaker state for {self.provider}: {redis_err}. Using fallback.")
            return self._local_state.get(f"{self.provider}:state", "CLOSED")

    async def _set_state(self, state: str):
        try:
            await self.redis.set(f"circuit_breaker:{self.provider}:state", state)
        except (RedisError, Exception) as redis_err:
            logger.warning(f"Redis error setting circuit breaker state for {self.provider}: {redis_err}. Using fallback.")
        self._local_state[f"{self.provider}:state"] = state

    async def get_failures(self) -> int:
        try:
            failures = await self.redis.get(f"circuit_breaker:{self.provider}:failures")
            if failures is not None:
                return int(failures)
            return 0
        except (RedisError, Exception) as redis_err:
            logger.warning(f"Redis error getting circuit breaker failures for {self.provider}: {redis_err}. Using fallback.")
            return self._local_state.get(f"{self.provider}:failures", 0)

    async def _set_failures(self, failures: int):
        try:
            await self.redis.set(f"circuit_breaker:{self.provider}:failures", failures)
        except (RedisError, Exception) as redis_err:
            logger.warning(f"Redis error setting circuit breaker failures for {self.provider}: {redis_err}. Using fallback.")
        self._local_state[f"{self.provider}:failures"] = failures

    async def get_last_state_change(self) -> float:
        try:
            t = await self.redis.get(f"circuit_breaker:{self.provider}:last_state_change")
            if t is not None:
                return float(t)
            return 0.0
        except (RedisError, Exception) as redis_err:
            logger.warning(f"Redis error getting last state change for {self.provider}: {redis_err}. Using fallback.")
            return self._local_state.get(f"{self.provider}:last_state_change", 0.0)

    async def _set_last_state_change(self, t: float):
        try:
            await self.redis.set(f"circuit_breaker:{self.provider}:last_state_change", t)
        except (RedisError, Exception) as redis_err:
            logger.warning(f"Redis error setting last state change for {self.provider}: {redis_err}. Using fallback.")
        self._local_state[f"{self.provider}:last_state_change"] = t

    async def check_allow_request(self) -> bool:
        """
        Determines whether requests are currently allowed.
        Manages transition from OPEN to HALF-OPEN based on cooldown duration.
        """
        state = await self.get_state()
        if state == "CLOSED":
            return True
            
        if state == "OPEN":
            last_change = await self.get_last_state_change()
            now = time.time()
            if now - last_change >= self.cooldown_period:
                logger.info(f"Cooldown elapsed. Transitioning circuit breaker for '{self.provider}' to HALF-OPEN.")
                await self._set_state("HALF-OPEN")
                return True
            return False
            
        # HALF-OPEN allows requests to pass through as trials
        return True

    async def record_success(self):
        """
        Records a successful operation, resetting failure counter and closing the circuit.
        """
        state = await self.get_state()
        if state in ("OPEN", "HALF-OPEN"):
            logger.info(f"Successful call. Closing circuit breaker for '{self.provider}'.")
            await self._set_state("CLOSED")
        await self._set_failures(0)

    async def record_failure(self):
        """
        Records a failure. If threshold is exceeded in CLOSED state, circuit transitions to OPEN.
        """
        failures = await self.get_failures() + 1
        await self._set_failures(failures)
        state = await self.get_state()
        
        logger.warning(f"Recorded failure {failures}/{self.failure_threshold} for provider '{self.provider}' (State: {state})")

        if state == "CLOSED" and failures >= self.failure_threshold:
            logger.error(f"Failure threshold reached. Opening circuit breaker for '{self.provider}'.")
            await self._set_state("OPEN")
            await self._set_last_state_change(time.time())
        elif state == "HALF-OPEN":
            logger.error(f"Failure in HALF-OPEN state. Re-opening circuit breaker for '{self.provider}'.")
            await self._set_state("OPEN")
            await self._set_last_state_change(time.time())
