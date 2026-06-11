import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to PYTHONPATH
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from app.models.problem import Problem
from app.routers.problems import create_dynamic_fallback_problem
from sqlalchemy import select

async def main():
    print("[PurgeScript] Connecting to database...")
    async with AsyncSessionLocal() as db:
        # 1. Find and delete problem with slug "2sum"
        stmt = select(Problem).where(Problem.slug == "2sum")
        res = await db.execute(stmt)
        problem_2sum = res.scalar_one_or_none()
        if problem_2sum:
            print(f"[PurgeScript] Found stale problem with slug '2sum'. Deleting...")
            await db.delete(problem_2sum)
            await db.commit()
            print("[PurgeScript] Deleted '2sum' successfully.")
        else:
            print("[PurgeScript] No problem with slug '2sum' found.")

        # 2. Find and delete problem with slug "two-sum" to allow clean regeneration
        stmt = select(Problem).where(Problem.slug == "two-sum")
        res = await db.execute(stmt)
        problem_two_sum = res.scalar_one_or_none()
        if problem_two_sum:
            print(f"[PurgeScript] Found problem with slug 'two-sum'. Deleting to allow clean regeneration...")
            await db.delete(problem_two_sum)
            await db.commit()
            print("[PurgeScript] Deleted 'two-sum' successfully.")

        # 3. Pre-generate the fresh high-fidelity Two Sum problem details!
        print("[PurgeScript] Pre-generating fresh high-fidelity Two Sum problem...")
        new_problem = await create_dynamic_fallback_problem(db, "2sum")
        await db.commit()
        print(f"[PurgeScript] Successfully created high-fidelity problem with title '{new_problem.title}' and slug '{new_problem.slug}'!")

if __name__ == "__main__":
    asyncio.run(main())
