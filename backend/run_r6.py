"""
Round 6 - Global & Weekly Leaderboards
Tests: GET /leaderboard (all time), GET /leaderboard?period=week, caching, pagination/limits, invalid values.
Uses in-process ASGI with SQLite in-memory DB.
"""
import asyncio, json, os, sys, time, uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

fake_redis_store = {}

fake_redis = MagicMock()
fake_redis.incr = AsyncMock(return_value=1)
fake_redis.expire = AsyncMock(return_value=True)
fake_redis.ping = AsyncMock(return_value=True)
fake_redis.aclose = AsyncMock()

async def redis_get(key):
    return fake_redis_store.get(key)

async def redis_setex(key, expire, value):
    fake_redis_store[key] = value
    return True

fake_redis.get = redis_get
fake_redis.setex = redis_setex

import app.services.rate_limit_service as rls
rls.RateLimitService.__init__ = lambda self, url=None: setattr(self, "redis", fake_redis) or None
rls.RateLimitService.close = AsyncMock()
rls.RateLimitService.ping = AsyncMock(return_value=True)
rls.RateLimitService.check_ip = AsyncMock(return_value=True)
rls.RateLimitService.check_submit = AsyncMock(return_value=True)

from app.core import config as cfg
class TestSettings:
    ENV="development"; SECRET_KEY="test-secret-key-32-chars-minimum!"; DATABASE_URL="sqlite+aiosqlite:///:memory:"
    ALEMBIC_DATABASE_URL="sqlite:///:memory:"; REDIS_URL="redis://localhost:6379/0"; JUDGE0_URL="http://localhost:2358"
    CORS_ORIGINS="http://localhost:5173"; API_V1_PREFIX="/api/v1"; ACCESS_TOKEN_EXPIRE_MINUTES=60
    MAX_SUBMISSIONS_PER_MINUTE=10; MAX_REQUESTS_PER_MINUTE_IP=100; MAX_SOURCE_BYTES=65536
    RECLAIM_ALL_RUNNING_ON_START=False; is_development=True; cors_origins=["http://localhost:5173"]
cfg.get_settings = lambda: TestSettings()

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import text
from app.core.database import Base, get_db
from app.main import create_app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

RESULTS = []
RUN_ID = str(int(time.time()))

def record(name, method, path, expected, actual, body, note=""):
    passed = actual == expected
    RESULTS.append({"name": name, "method": method, "path": path,
                    "expected": expected, "actual": actual, "passed": passed, "body": body})
    marker = "PASS" if passed else "FAIL"
    print(f"[{marker}] {name} | expected={expected} actual={actual}" + (f" | {note}" if note else ""))
    if not passed:
        print(f"       body={json.dumps(body, default=str)[:300]}")

async def seed_user_with_stats(email, username, score, solved):
    async with SessionLocal() as s:
        from app.models.user import User
        from app.core.security import hash_password
        user = User(
            email=email,
            username=username,
            password_hash=hash_password("Password123"),
            is_active=True
        )
        s.add(user)
        await s.flush()
        
        # Create user stats
        from app.models.user_stats import UserStats
        import datetime
        stats = UserStats(
            user_id=user.id,
            total_solved=solved,
            easy_solved=solved,
            total_score=score,
            current_streak=1,
            best_streak=1,
            last_active_date=datetime.date.today()
        )
        s.add(stats)
        
        # Create an ACCEPTED submission for weekly query (created_at=now)
        from app.models.submission import Submission, SubmissionStatus
        sub = Submission(
            user_id=user.id,
            problem_id=uuid.uuid4(),  # fake problem
            language="python",
            source_code="def add(a,b): return a+b",
            status=SubmissionStatus.ACCEPTED,
            score=score,
            passed_count=4,
            total_count=4,
            passed_weight=7,
            total_weight=7,
            run_samples_only=False,
            created_at=datetime.datetime.utcnow()
        )
        s.add(sub)
        
        await s.commit()

async def run_round_6():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed some users
    await seed_user_with_stats(f"u1-{RUN_ID}@example.com", f"alice_{RUN_ID}", 150, 2)
    await seed_user_with_stats(f"u2-{RUN_ID}@example.com", f"bob_{RUN_ID}", 250, 3)
    await seed_user_with_stats(f"u3-{RUN_ID}@example.com", f"charlie_{RUN_ID}", 50, 1)

    app = create_app()
    async def override_db():
        async with SessionLocal() as s:
            yield s
    app.dependency_overrides[get_db] = override_db

    # Inject our fake redis so the router gets it from state.rate_limit_service.redis
    fake_rls = MagicMock()
    fake_rls.redis = fake_redis
    fake_rls.check_ip = AsyncMock(return_value=True)
    fake_rls.close = AsyncMock()
    app.state.rate_limit_service = fake_rls

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as c:
        B = "/api/v1"

        # Make sure cache is clean
        fake_redis_store.clear()

        # ── R6-01: GET /leaderboard (all time) cache miss ──────────────────────
        r = await c.get(f"{B}/leaderboard/")
        print(f"DEBUG: R6-01 response status={r.status_code} text={r.text[:500]}")
        try:
            body = r.json()
        except Exception as e:
            body = {"error": str(e), "text": r.text}
        record("R6-01 leaderboard all-time", "GET", "/leaderboard/", 200, r.status_code, body)
        # Check that cache was populated
        has_cache = "leaderboard:all" in fake_redis_store
        # Check order: Bob (250), Alice (150), Charlie (50)
        bob_ok = isinstance(body, list) and len(body) >= 3 and body[0]["username"] == f"bob_{RUN_ID}"
        alice_ok = isinstance(body, list) and len(body) >= 3 and body[1]["username"] == f"alice_{RUN_ID}"
        ranks_ok = [item["rank"] for item in body] == [1, 2, 3] if len(body) >= 3 else False
        print(f"       cache_populated={has_cache} order_ok={bob_ok and alice_ok} ranks_ok={ranks_ok}")

        # ── R6-02: GET /leaderboard - cache hit ───────────────────────────────
        # Modify the cache content directly to verify it reads from cache
        cached_fake = [{"username": "fake_cached_user", "total_score": 9999, "total_solved": 99, "rank": 1}]
        fake_redis_store["leaderboard:all"] = json.dumps(cached_fake)
        r = await c.get(f"{B}/leaderboard/")
        body = r.json()
        record("R6-02 leaderboard all-time cache hit", "GET", "/leaderboard/", 200, r.status_code, body)
        cache_hit_ok = body[0]["username"] == "fake_cached_user" if len(body) > 0 else False
        print(f"       returned_cached_content={cache_hit_ok}")

        # Restore cache cleanliness for weekly
        fake_redis_store.clear()

        # ── R6-03: GET /leaderboard?period=week ───────────────────────────────
        r = await c.get(f"{B}/leaderboard/?period=week")
        body = r.json()
        record("R6-03 leaderboard weekly", "GET", "/leaderboard/?period=week", 200, r.status_code, body)
        # Check that bob is rank 1, alice is rank 2, charlie is rank 3
        weekly_bob_ok = body[0]["username"] == f"bob_{RUN_ID}" if len(body) >= 3 else False
        weekly_ranks_ok = [item["rank"] for item in body] == [1, 2, 3] if len(body) >= 3 else False
        has_week_cache = "leaderboard:week" in fake_redis_store
        print(f"       weekly_cache_populated={has_week_cache} weekly_order_ok={weekly_bob_ok} weekly_ranks_ok={weekly_ranks_ok}")

        # ── R6-04: GET /leaderboard?period=week cache hit ─────────────────────
        weekly_cached_fake = [{"username": "fake_weekly_user", "weekly_score": 888, "weekly_solved": 8, "rank": 1}]
        fake_redis_store["leaderboard:week"] = json.dumps(weekly_cached_fake)
        r = await c.get(f"{B}/leaderboard/?period=week")
        body = r.json()
        record("R6-04 weekly cache hit", "GET", "/leaderboard/?period=week", 200, r.status_code, body)
        weekly_cache_hit_ok = body[0]["username"] == "fake_weekly_user" if len(body) > 0 else False
        print(f"       returned_weekly_cached={weekly_cache_hit_ok}")

        # ── R6-05: invalid period ─────────────────────────────────────────────
        r = await c.get(f"{B}/leaderboard/?period=month")
        record("R6-05 invalid period", "GET", "/leaderboard?period=month", 422, r.status_code, r.json())

        # ── R6-06: invalid limit=0 ────────────────────────────────────────────
        r = await c.get(f"{B}/leaderboard/?limit=0")
        record("R6-06 invalid limit=0", "GET", "/leaderboard?limit=0", 422, r.status_code, r.json())

        # ── R6-07: invalid limit=101 ──────────────────────────────────────────
        r = await c.get(f"{B}/leaderboard/?limit=101")
        record("R6-07 invalid limit=101", "GET", "/leaderboard?limit=101", 422, r.status_code, r.json())

        # ── R6-08: valid limit=2 ──────────────────────────────────────────────
        fake_redis_store.clear()  # force DB query
        r = await c.get(f"{B}/leaderboard/?limit=2")
        body = r.json()
        record("R6-08 valid limit=2", "GET", "/leaderboard/?limit=2", 200, r.status_code, body)
        limit_ok = len(body) == 2
        print(f"       returned_exactly_2_rows={limit_ok}")

    out_path = Path("api_round_6_raw_results.json")
    out_path.write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    passed = sum(1 for r in RESULTS if r["passed"])
    print(f"\nRound 6: {passed}/{len(RESULTS)} HTTP status checks passed")
    return RESULTS

if __name__ == "__main__":
    asyncio.run(run_round_6())
