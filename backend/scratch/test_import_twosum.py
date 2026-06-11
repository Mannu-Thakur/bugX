import asyncio
import sys
from pathlib import Path

# Add backend directory to PYTHONPATH
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from app.services.google_importer import GoogleImporter

async def main():
    print("[Test] Connecting to database...")
    async with AsyncSessionLocal() as db:
        try:
            print("[Test] Calling GoogleImporter.resolve_and_import with 'two sum'...")
            problem = await GoogleImporter.resolve_and_import(db, "two sum")
            print(f"[Test] Successfully imported: Title: '{problem.title}', Slug: '{problem.slug}'")
            print("Description:", problem.description[:200])
        except Exception as e:
            print("[Test] Failed with exception:", e)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
