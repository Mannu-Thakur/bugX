import asyncio
import json
import logging
import signal
import time
from datetime import datetime, timedelta, timezone
import uuid

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.repositories.submission_repo import SubmissionRepo
from app.models.submission import SubmissionStatus
from app.services.judge0_client import Judge0Client
from app.services.judge_service import JudgeService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("submission_worker")

class SubmissionWorker:
    def __init__(self):
        self.settings = get_settings()
        self.redis = aioredis.from_url(self.settings.REDIS_URL, decode_responses=True, socket_timeout=15.0)
        self.judge0_client = Judge0Client(self.settings.JUDGE0_URL)
        self.judge_service = JudgeService(self.judge0_client)
        self.running = True

    def stop(self):
        self.running = False

    async def reclaim_stale(self):
        logger.info("Starting worker reclaim process...")
        async with AsyncSessionLocal() as session:
            # 10 minutes threshold
            if self.settings.RECLAIM_ALL_RUNNING_ON_START:
                threshold = datetime.now(timezone.utc) + timedelta(days=365) # effectively all
                logger.info("RECLAIM_ALL_RUNNING_ON_START=true, reclaiming all RUNNING jobs")
            else:
                threshold = datetime.now(timezone.utc) - timedelta(minutes=10)

            stale_submissions = await SubmissionRepo.get_stale_running(session, threshold)
            count = 0
            for sub in stale_submissions:
                # A live worker may legitimately run a job longer than the
                # stale threshold. Its lease is the ownership signal; do not
                # reset its database claim while that lease is present.
                if await self.redis.exists(f"submission_lease:{sub.id}"):
                    continue
                await SubmissionRepo.reset_to_pending(session, sub.id)
                await session.commit()
                # Re-queue
                queue_payload = json.dumps({"submission_id": str(sub.id)})
                await self.redis.lpush("submission_queue", queue_payload)
                count += 1

            # A process can die after committing a submission row but before
            # pushing it to Redis. Re-enqueue all pending rows on worker start;
            # the atomic PENDING -> RUNNING claim makes duplicates harmless.
            pending_submissions = await SubmissionRepo.get_pending(session)
            for sub in pending_submissions:
                await self.redis.lpush(
                    "submission_queue",
                    json.dumps({"submission_id": str(sub.id)}),
                )

            logger.info(
                "Reclaimed %s stale submissions and queued %s pending submissions",
                count,
                len(pending_submissions),
            )

    async def _refresh_lease(self, lease_key: str, owner: str):
        refresh_script = (
            "if redis.call('GET', KEYS[1]) == ARGV[1] "
            "then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end"
        )
        while self.running:
            await asyncio.sleep(30)
            try:
                refreshed = await self.redis.eval(refresh_script, 1, lease_key, owner, 180)
                if not refreshed:
                    return
            except Exception as exc:
                logger.warning("Could not refresh worker lease: %s", exc)

    async def _release_lease(self, lease_key: str, owner: str):
        release_script = (
            "if redis.call('GET', KEYS[1]) == ARGV[1] "
            "then return redis.call('DEL', KEYS[1]) else return 0 end"
        )
        try:
            await self.redis.eval(release_script, 1, lease_key, owner)
        except Exception as exc:
            logger.warning("Could not release worker lease: %s", exc)

    async def recover_inflight(self):
        """Requeue in-flight jobs whose worker lease expired after a crash."""
        items = await self.redis.lrange("submission_processing", 0, -1)
        for payload_str in dict.fromkeys(items):
            try:
                payload = json.loads(payload_str)
                submission_id = uuid.UUID(payload["submission_id"])
            except (ValueError, KeyError, TypeError, json.JSONDecodeError):
                await self.redis.lrem("submission_processing", 1, payload_str)
                continue

            lease_key = f"submission_lease:{submission_id}"
            recovery_owner = f"recovery:{uuid.uuid4().hex}"
            if not await self.redis.set(lease_key, recovery_owner, ex=30, nx=True):
                continue
            try:
                async with AsyncSessionLocal() as session:
                    submission = await SubmissionRepo.get_by_id(session, submission_id)
                    if not submission or submission.status not in (
                        SubmissionStatus.PENDING,
                        SubmissionStatus.RUNNING,
                    ):
                        await self.redis.lrem("submission_processing", 1, payload_str)
                        continue
                    if submission.status == SubmissionStatus.RUNNING:
                        updated_at = submission.updated_at
                        if updated_at and updated_at.tzinfo is None:
                            updated_at = updated_at.replace(tzinfo=timezone.utc)
                        # Match the ordinary stale-job threshold so a brief
                        # Redis lease interruption cannot start a second judge
                        # while the original worker is still executing.
                        if updated_at and updated_at > datetime.now(timezone.utc) - timedelta(minutes=10):
                            continue
                        await SubmissionRepo.reset_to_pending(session, submission_id)
                        await session.commit()
                await self.redis.lrem("submission_processing", 1, payload_str)
                await self.redis.lpush("submission_queue", payload_str)
            finally:
                await self._release_lease(lease_key, recovery_owner)

    async def run(self):
        while self.running:
            try:
                await self.reclaim_stale()
                await self.recover_inflight()
                break
            except Exception as e:
                logger.error("Worker recovery could not connect to dependencies: %s", e)
                await asyncio.sleep(5)
        logger.info("Worker started, waiting for jobs...")
        next_recovery = time.monotonic() + 30

        while self.running:
            try:
                # Atomically move the job to an in-flight list so a worker
                # crash does not silently discard the only queue copy.
                payload_str = await self.redis.brpoplpush(
                    "submission_queue", "submission_processing", timeout=5
                )
                if not payload_str:
                    if time.monotonic() >= next_recovery:
                        await self.recover_inflight()
                        next_recovery = time.monotonic() + 30
                    continue

                try:
                    payload = json.loads(payload_str)
                    submission_id = uuid.UUID(payload["submission_id"])
                except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
                    logger.error("Discarding malformed submission queue item: %s", exc)
                    await self.redis.lrem("submission_processing", 1, payload_str)
                    continue

                lease_key = f"submission_lease:{submission_id}"
                lease_owner = uuid.uuid4().hex
                if not await self.redis.set(lease_key, lease_owner, ex=180, nx=True):
                    # Another worker owns the in-flight copy; this is a safe
                    # duplicate created by startup reconciliation.
                    await self.redis.lrem("submission_processing", 1, payload_str)
                    continue
                lease_task = asyncio.create_task(self._refresh_lease(lease_key, lease_owner))
                try:
                    await self.process_submission(submission_id)
                    await self.redis.lrem("submission_processing", 1, payload_str)
                except Exception as e:
                    logger.error("Worker error processing %s: %s", submission_id, e)
                    await self.redis.lrem("submission_processing", 1, payload_str)
                    await self.redis.lpush("submission_queue", payload_str)
                    await asyncio.sleep(1)
                finally:
                    lease_task.cancel()
                    try:
                        await lease_task
                    except asyncio.CancelledError:
                        pass
                    await self._release_lease(lease_key, lease_owner)
                if time.monotonic() >= next_recovery:
                    await self.recover_inflight()
                    next_recovery = time.monotonic() + 30

            except Exception as e:
                logger.error(f"Worker error: {e}")
                await asyncio.sleep(1)

    async def process_submission(self, submission_id: uuid.UUID):
        logger.info(f"Processing submission {submission_id}")
        async with AsyncSessionLocal() as session:
            try:
                sub = await SubmissionRepo.get_by_id(session, submission_id)
                if not sub or sub.status.value != "PENDING":
                    logger.info(f"Submission {submission_id} not PENDING, skipping")
                    return

                # Atomically set to RUNNING
                success = await SubmissionRepo.set_status(session, submission_id, SubmissionStatus.PENDING, SubmissionStatus.RUNNING)
                await session.commit()

                if not success:
                    logger.info(f"Failed to lock submission {submission_id}, skipping")
                    return

                # We have the lock
                await self.judge_service.run(session, submission_id)
                await session.commit()

                # Fetch fresh submission row for scoring
                sub = await SubmissionRepo.get_by_id(session, submission_id)
                if sub and not sub.run_samples_only:
                    from app.services.scoring_service import ScoringService
                    scoring_service = ScoringService(self.redis)
                    try:
                        await scoring_service.on_submission_complete(session, sub)
                        await session.commit()
                    except Exception as scoring_err:
                        logger.error(f"Scoring failed for submission {submission_id}: {scoring_err}")
                        await session.rollback()

                logger.info(f"Finished processing submission {submission_id}")

            except Exception as e:
                logger.error(f"Error processing submission {submission_id}: {e}")
                # Set to RUNTIME_ERROR
                try:
                    await session.rollback() # clear failed transaction
                    sub = await SubmissionRepo.get_by_id(session, submission_id)
                    if sub:
                        sub.status = SubmissionStatus.RUNTIME_ERROR
                        sub.error_message = f"Worker unhandled exception: {str(e)}"
                        sub.updated_at = datetime.now(timezone.utc)
                        await session.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to set RUNTIME_ERROR for {submission_id}: {inner_e}")
                    raise


def main():
    worker = SubmissionWorker()

    def handle_signal(sig, frame):
        logger.info("Gracefully shutting down worker...")
        worker.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    asyncio.run(worker.run())

if __name__ == "__main__":
    main()
