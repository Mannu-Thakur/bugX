import json
import uuid
import logging
from redis.asyncio import Redis
from redis.exceptions import RedisError
from app.core.config import get_settings
from app.services.import_utils import IS_TESTING

logger = logging.getLogger("import_job_manager")

class ImportJobManager:
    _local_jobs = {}  # Fallback in-memory job status store for testing/Redis outages
    _local_queue = []  # Fallback in-memory queue

    @classmethod
    def _get_redis(cls, socket_timeout: float = 0.5) -> Redis:
        settings = get_settings()
        return Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=socket_timeout,
        )


    @classmethod
    async def enqueue_import(cls, url_or_slug: str, user_id: str = None) -> str:
        """
        Enqueues a new import request and returns a unique job ID.
        """
        job_id = str(uuid.uuid4())
        job_data = {
            "id": job_id,
            "url_or_slug": url_or_slug,
            "user_id": user_id,
            "status": "pending",
            "progress": 0,
            "result": None,
            "error": None
        }

        # Track query usage in top queries sorted set
        try:
            redis = cls._get_redis()
            try:
                # Increment the search count for this query
                from app.services.import_utils import normalize_title_aggressive
                norm_q = normalize_title_aggressive(url_or_slug)
                if norm_q:
                    await redis.zincrby("metrics:top_queries", 1, norm_q)
            finally:
                await redis.aclose()
        except Exception as e:
            logger.warning(f"Failed to record top query metric: {e}")

        # Store initial state and queue the task
        use_redis = not IS_TESTING
        if use_redis:
            try:
                redis = cls._get_redis()
                try:
                    await redis.set(f"import_job:{job_id}", json.dumps(job_data), ex=86400)
                    payload = json.dumps({
                        "job_id": job_id,
                        "url_or_slug": url_or_slug,
                        "user_id": user_id
                    })
                    await redis.lpush("import_queue", payload)
                    logger.info(f"Enqueued job {job_id} to Redis import_queue")
                    return job_id
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as err:
                logger.warning(f"Redis queue failure: {err}. Falling back to in-memory queue.")
                use_redis = False

        # In-memory fallback
        cls._local_jobs[job_id] = job_data
        cls._local_queue.append({
            "job_id": job_id,
            "url_or_slug": url_or_slug,
            "user_id": user_id
        })
        logger.info(f"Enqueued job {job_id} to local in-memory queue")
        return job_id

    @classmethod
    async def dequeue_import(cls, timeout: int = 5) -> dict | None:
        """
        Dequeues an import job from the queue (blocking with timeout).
        Returns a dict: {"job_id": job_id, "url_or_slug": url_or_slug, "user_id": user_id} or None.
        """
        if not IS_TESTING:
            try:
                redis = cls._get_redis(socket_timeout=timeout + 5.0)
                try:
                    result = await redis.brpop("import_queue", timeout=timeout)
                    if result:
                        _, payload_str = result
                        return json.loads(payload_str)
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as err:
                logger.warning(f"Redis dequeue failure: {err}. Trying local fallback.")

        # Local in-memory queue fallback
        if cls._local_queue:
            return cls._local_queue.pop(0)
        return None

    @classmethod
    async def get_job_status(cls, job_id: str) -> dict | None:
        """
        Retrieves the status of an import job.
        """
        if not IS_TESTING:
            try:
                redis = cls._get_redis()
                try:
                    data = await redis.get(f"import_job:{job_id}")
                    if data:
                        return json.loads(data)
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as err:
                logger.warning(f"Redis error getting status for job {job_id}: {err}. Trying fallback.")

        return cls._local_jobs.get(job_id)

    @classmethod
    async def update_progress(cls, job_id: str, progress: int):
        """
        Updates the progress percentage of an in-progress job.
        """
        job_data = await cls.get_job_status(job_id)
        if not job_data:
            return

        job_data["progress"] = progress
        job_data["status"] = "processing"

        if not IS_TESTING:
            try:
                redis = cls._get_redis()
                try:
                    await redis.set(f"import_job:{job_id}", json.dumps(job_data), ex=86400)
                    return
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as err:
                logger.warning(f"Redis error updating progress for job {job_id}: {err}. Trying fallback.")

        cls._local_jobs[job_id] = job_data

    @classmethod
    async def complete_job(cls, job_id: str, result_slug: str, details: dict = None):
        """
        Marks a job as completed with its outcome.
        """
        job_data = await cls.get_job_status(job_id)
        if not job_data:
            return

        job_data["progress"] = 100
        job_data["status"] = "completed"
        job_data["result"] = {"slug": result_slug, "details": details}

        if not IS_TESTING:
            try:
                redis = cls._get_redis()
                try:
                    await redis.set(f"import_job:{job_id}", json.dumps(job_data), ex=86400)
                    return
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as err:
                logger.warning(f"Redis error completing job {job_id}: {err}. Trying fallback.")

        cls._local_jobs[job_id] = job_data

    @classmethod
    async def fail_job(cls, job_id: str, error_msg: str):
        """
        Marks a job as failed with an error message.
        """
        job_data = await cls.get_job_status(job_id)
        if not job_data:
            return

        job_data["progress"] = 100
        job_data["status"] = "failed"
        job_data["error"] = error_msg

        if not IS_TESTING:
            try:
                redis = cls._get_redis()
                try:
                    await redis.set(f"import_job:{job_id}", json.dumps(job_data), ex=86400)
                    return
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as err:
                logger.warning(f"Redis error failing job {job_id}: {err}. Trying fallback.")

        cls._local_jobs[job_id] = job_data
