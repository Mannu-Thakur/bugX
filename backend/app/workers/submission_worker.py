import asyncio
import json
import logging
import signal
from datetime import datetime, timedelta
import uuid

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.repositories.submission_repo import SubmissionRepo
from app.services.judge0_client import Judge0Client
from app.services.judge_service import JudgeService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("submission_worker")

class SubmissionWorker:
    def __init__(self):
        self.settings = get_settings()
        self.redis = aioredis.from_url(self.settings.REDIS_URL, decode_responses=True)
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
                threshold = datetime.utcnow() + timedelta(days=365) # effectively all
                logger.info("RECLAIM_ALL_RUNNING_ON_START=true, reclaiming all RUNNING jobs")
            else:
                threshold = datetime.utcnow() - timedelta(minutes=10)

            stale_submissions = await SubmissionRepo.get_stale_running(session, threshold)
            count = 0
            for sub in stale_submissions:
                await SubmissionRepo.reset_to_pending(session, sub.id)
                await session.commit()
                # Re-queue
                queue_payload = json.dumps({"submission_id": str(sub.id)})
                await self.redis.lpush("submission_queue", queue_payload)
                count += 1
            
            logger.info(f"Reclaimed {count} stale submissions")

    async def run(self):
        await self.reclaim_stale()
        logger.info("Worker started, waiting for jobs...")

        while self.running:
            try:
                # BRPOP blocks for 5 seconds
                result = await self.redis.brpop("submission_queue", timeout=5)
                if not result:
                    continue
                
                _, payload_str = result
                payload = json.loads(payload_str)
                submission_id = uuid.UUID(payload["submission_id"])
                
                await self.process_submission(submission_id)
            
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
                from app.models.submission import SubmissionStatus
                success = await SubmissionRepo.set_status(session, submission_id, SubmissionStatus.PENDING, SubmissionStatus.RUNNING)
                await session.commit()
                
                if not success:
                    logger.info(f"Failed to lock submission {submission_id}, skipping")
                    return
                
                # We have the lock
                await self.judge_service.run(session, submission_id)
                await session.commit()
                logger.info(f"Finished processing submission {submission_id}")

            except Exception as e:
                logger.error(f"Error processing submission {submission_id}: {e}")
                # Set to RUNTIME_ERROR
                from app.models.submission import SubmissionStatus
                try:
                    await session.rollback() # clear failed transaction
                    sub = await SubmissionRepo.get_by_id(session, submission_id)
                    if sub:
                        sub.status = SubmissionStatus.RUNTIME_ERROR
                        sub.error_message = f"Worker unhandled exception: {str(e)}"
                        sub.updated_at = datetime.utcnow()
                        await session.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to set RUNTIME_ERROR for {submission_id}: {inner_e}")


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
