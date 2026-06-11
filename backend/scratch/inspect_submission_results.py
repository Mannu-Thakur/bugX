import asyncio
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, db_url
from app.models.submission import Submission
from app.models.submission_result import SubmissionResult

async def main():
    print(f"Using database: {db_url}")
    async with AsyncSessionLocal() as session:
        # Get submissions with RUNTIME_ERROR
        stmt = select(Submission).where(Submission.status == "RUNTIME_ERROR").order_by(Submission.created_at.desc())
        res = await session.execute(stmt)
        submissions = res.scalars().all()
        if not submissions:
            print("No RUNTIME_ERROR submissions found.")
            return

        for sub in submissions:
            print("=" * 60)
            print(f"Submission ID: {sub.id}")
            print(f"Status: {sub.status}")
            print(f"Error Message: {sub.error_message}")

            # Fetch results
            r_stmt = select(SubmissionResult).where(SubmissionResult.submission_id == sub.id)
            r_res = await session.execute(r_stmt)
            results = r_res.scalars().all()
            print(f"Results count: {len(results)}")
            for r in results:
                print(f"  Test Case ID: {r.test_case_id}")
                print(f"  Passed: {r.passed}")
                print(f"  Runtime MS: {r.runtime_ms}")
                print(f"  Memory KB: {r.memory_kb}")
                print(f"  Stdout: {repr(r.stdout)}")
                print(f"  Stderr: {repr(r.stderr)}")

if __name__ == "__main__":
    asyncio.run(main())
