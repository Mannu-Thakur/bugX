import asyncio
import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from app.services.google_importer import GoogleImporter
from sqlalchemy import text

async def main():
    print("[Test] Purging 'two-sum' to force fresh import with hints...")
    async with AsyncSessionLocal() as db:
        try:
            # Delete two-sum from database
            res = await db.execute(text("DELETE FROM problems WHERE slug = 'two-sum'"))
            await db.commit()
            print(f"[Test] Deleted {res.rowcount} problem rows.")

            # Re-import two-sum
            print("[Test] Importing 'two sum'...")
            problem = await GoogleImporter.resolve_and_import(db, "two sum")
            print(f"[Test] Imported problem title: {problem.title}")
            print(f"[Test] Hints stored: {problem.hints}")
        except Exception as e:
            print("[Test] Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
