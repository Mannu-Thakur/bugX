import asyncio
import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        # Delete all problems with fallback descriptions
        res = await db.execute(text("DELETE FROM problems WHERE description LIKE '%backup compiler engine%'"))
        print(f"Deleted {res.rowcount} stale fallback problems")
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
