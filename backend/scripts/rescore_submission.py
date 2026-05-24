import asyncio
import sys
import uuid
import logging
from redis.asyncio import Redis

import os
# Add backend to sys.path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import AsyncSessionLocal
from app.repositories.submission_repo import SubmissionRepo
from app.services.scoring_service import ScoringService
from app.models.submission import SubmissionStatus
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rescore_submission")

async def rescore(submission_id_str: str):
    try:
        submission_id = uuid.UUID(submission_id_str)
    except ValueError:
        logger.error("Invalid UUID format")
        sys.exit(1)
        return

    settings = get_settings()
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    scoring_service = ScoringService(redis)

    async with AsyncSessionLocal() as session:
        sub = await SubmissionRepo.get_by_id(session, submission_id)
        if not sub:
            logger.error("Submission not found")
            await redis.aclose()
            sys.exit(1)
            return
        
        if sub.status != SubmissionStatus.ACCEPTED:
            logger.error("Submission is not ACCEPTED")
            await redis.aclose()
            sys.exit(1)
            return
            
        if sub.run_samples_only:
            logger.error("Submission is samples only")
            await redis.aclose()
            sys.exit(1)
            return
            
        logger.info(f"Rescoring submission {submission_id} (current score: {sub.score})")
        
        try:
            await scoring_service.on_submission_complete(session, sub)
            await session.commit()
            logger.info("Scoring complete")
        except Exception as e:
            logger.error(f"Failed to rescore: {e}")
            await session.rollback()
            await redis.aclose()
            sys.exit(1)
            return
            
    await redis.aclose()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python rescore_submission.py <submission_id>")
        sys.exit(1)
    asyncio.run(rescore(sys.argv[1]))
