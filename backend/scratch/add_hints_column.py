import asyncio
import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    print("[Db] Connecting to database to check/add 'hints' column...")
    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(text("PRAGMA table_info(problems)"))
            columns = res.fetchall()
            col_names = [col[1] for col in columns]
            if "hints" not in col_names:
                print("[Db] 'hints' column not found in 'problems' table. Adding it now...")
                await db.execute(text("ALTER TABLE problems ADD COLUMN hints TEXT"))
                await db.commit()
                print("[Db] Successfully added 'hints' column!")
            else:
                print("[Db] 'hints' column already exists in 'problems' table.")
        except Exception as e:
            print("[Db] Error altering table:", e)

if __name__ == "__main__":
    asyncio.run(main())
