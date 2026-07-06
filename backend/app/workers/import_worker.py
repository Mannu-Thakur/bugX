import asyncio
import logging
import signal
import uuid
from sqlalchemy import select, insert

from app.core.database import AsyncSessionLocal
from app.services.import_job_manager import ImportJobManager
from app.services.import_orchestrator import ImportOrchestrator
from app.models.problem import user_problems

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("import_worker")

class ImportWorker:
    def __init__(self):
        self.running = True

    def stop(self):
        self.running = False

    async def run(self):
        logger.info("Import worker started, waiting for jobs...")
        while self.running:
            try:
                # Retrieve next job from queue
                job = await ImportJobManager.dequeue_import(timeout=5)
                if not job:
                    continue
                
                job_id = job["job_id"]
                url_or_slug = job["url_or_slug"]
                user_id_str = job.get("user_id")

                logger.info(f"Processing background import job {job_id} for query '{url_or_slug}'")
                
                # Run the orchestrator
                async with AsyncSessionLocal() as session:
                    try:
                        problem = await ImportOrchestrator.import_problem(session, url_or_slug, job_id=job_id)
                        
                        # Mark imported problems as non-public
                        problem.is_public = False
                        session.add(problem)
                        await session.flush()
                        
                        # Associate with user if user_id is provided
                        if user_id_str:
                            user_id = uuid.UUID(user_id_str)
                            assoc_stmt = select(user_problems).where(
                                user_problems.c.user_id == user_id,
                                user_problems.c.problem_id == problem.id
                            )
                            assoc_res = await session.execute(assoc_stmt)
                            if not assoc_res.first():
                                insert_stmt = insert(user_problems).values(
                                    user_id=user_id,
                                    problem_id=problem.id
                                )
                                await session.execute(insert_stmt)
                                
                        await session.commit()
                        logger.info(f"Successfully processed import job {job_id} -> problem: {problem.slug}")
                    except Exception as e:
                        await session.rollback()
                        logger.error(f"Error processing import job {job_id}: {e}")
                        # Update status to failed
                        await ImportJobManager.fail_job(job_id, str(e))
                        
            except Exception as e:
                logger.error(f"Import worker error: {e}")
                await asyncio.sleep(1)

def main():
    worker = ImportWorker()

    def handle_signal(sig, frame):
        logger.info("Gracefully shutting down import worker...")
        worker.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    asyncio.run(worker.run())

if __name__ == "__main__":
    main()
