import asyncio
import sys
from pathlib import Path

# Add backend directory to PYTHONPATH
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        # Search in problems table
        res = await db.execute(text("SELECT id, slug, description FROM problems WHERE description LIKE '%backup%' OR description LIKE '%synthesized%'"))
        rows = res.all()
        print(f"Found {len(rows)} matching problems:")
        for r in rows:
            print(f"- ID: {r[0]}, Slug: {r[1]}")
            print(f"  Description: {r[2]}")

if __name__ == "__main__":
    asyncio.run(main())
