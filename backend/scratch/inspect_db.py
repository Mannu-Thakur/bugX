import asyncio
import sys
from pathlib import Path

# Add backend directory to PYTHONPATH
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from app.models.problem import Problem
from sqlalchemy import select

async def main():
    print("[Inspect] Connecting to database...")
    async with AsyncSessionLocal() as db:
        stmt = select(Problem)
        res = await db.execute(stmt)
        problems = res.scalars().all()
        print(f"[Inspect] Found {len(problems)} problems in the database:")
        for p in problems:
            print(f"- ID: {p.id}, Slug: '{p.slug}', Title: '{p.title}', Difficulty: {p.difficulty}")
            print(f"  Description Snippet: {p.description[:100]}...")

if __name__ == "__main__":
    asyncio.run(main())
