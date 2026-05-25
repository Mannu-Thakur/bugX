"""
Round 7 - Worker Reclaim and Admin Rescore Submission
Tests:
- rescore script (argument validation, nonexistent, non-ACCEPTED, sample-only, successful rescore with new problem config & user stats recomputation, Redis cache invalidation)
- Worker Reclaim (identifying stale RUNNING submissions, setting them to PENDING, re-queueing in Redis)
Uses in-process ASGI with SQLite in-memory DB.
"""
import asyncio, json, os, sys, time, uuid, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

fake_redis_deleted = []
fake_redis_queue = []

fake_redis = MagicMock()
fake_redis.incr = AsyncMock(return_value=1)
fake_redis.expire = AsyncMock(return_value=True)
fake_redis.ping = AsyncMock(return_value=True)
fake_redis.aclose = AsyncMock()

async def redis_delete(*keys):
    fake_redis_deleted.extend(keys)
    return len(keys)

async def redis_lpush(key, value):
    fake_redis_queue.append((key, value))
    return 1

fake_redis.delete = redis_delete
fake_redis.lpush = redis_lpush

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
    RECLAIM_ALL_RUNNING_ON_START=True; is_development=True; cors_origins=["http://localhost:5173"]
cfg.get_settings = lambda: TestSettings()

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text, update, select
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import create_app
from app.models.user import User
from app.models.problem import Problem, DifficultyEnum
from app.models.submission import Submission, SubmissionStatus
from app.models.user_stats import UserStats
from scripts.rescore_submission import rescore

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

# Patch AsyncSessionLocal in scripts.rescore_submission to use our in-memory SessionLocal
import scripts.rescore_submission as rescore_script
rescore_script.AsyncSessionLocal = SessionLocal
# Patch Redis.from_url to return our fake_redis
from redis.asyncio import Redis
Redis.from_url = MagicMock(return_value=fake_redis)

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

async def run_round_7():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # ── Set up User and Problem ──
    async with SessionLocal() as s:
        from app.core.security import hash_password
        user = User(
            email=f"u-{RUN_ID}@example.com",
            username=f"u_{RUN_ID}",
            password_hash=hash_password("Password123"),
            is_active=True
        )
        s.add(user)
        await s.flush()
        user_id = user.id

        problem = Problem(
            slug=f"r7-{RUN_ID}-prob",
            title="R7 Problem",
            description="Testing rescore and reclaim.",
            difficulty=DifficultyEnum.MEDIUM,
            time_limit_ms=2000,
            memory_limit_kb=262144,
            score_base=100,
            runtime_bonus_max=20,
            is_published=True
        )
        s.add(problem)
        await s.flush()
        problem_id = problem.id

        # Insert UserStats
        stats = UserStats(
            user_id=user_id,
            total_solved=1,
            medium_solved=1,
            total_score=110,
            current_streak=1,
            best_streak=1,
            last_active_date=datetime.date.today()
        )
        s.add(stats)

        # Create ACCEPTED submission (score=110)
        sub_ac = Submission(
            user_id=user_id,
            problem_id=problem_id,
            language="python",
            source_code="print('hello')",
            status=SubmissionStatus.ACCEPTED,
            passed_count=4,
            total_count=4,
            passed_weight=7,
            total_weight=7,
            score=110,
            runtime_ms=1000, # 1000ms out of 2000ms => ratio 0.5. bonus = 20 * 0.5 = 10. score = 100 + 10 = 110.
            run_samples_only=False,
            created_at=datetime.datetime.utcnow()
        )
        s.add(sub_ac)

        # Create PENDING submission
        sub_pend = Submission(
            user_id=user_id,
            problem_id=problem_id,
            language="python",
            source_code="print('pending')",
            status=SubmissionStatus.PENDING,
            run_samples_only=False,
            created_at=datetime.datetime.utcnow()
        )
        s.add(sub_pend)

        # Create sample-only submission
        sub_sample = Submission(
            user_id=user_id,
            problem_id=problem_id,
            language="python",
            source_code="print('sample')",
            status=SubmissionStatus.ACCEPTED,
            run_samples_only=True,
            created_at=datetime.datetime.utcnow()
        )
        s.add(sub_sample)

        # Create a stalled RUNNING submission (for Reclaim test)
        sub_stalled = Submission(
            user_id=user_id,
            problem_id=problem_id,
            language="python",
            source_code="print('running')",
            status=SubmissionStatus.RUNNING,
            run_samples_only=False,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=30),
            updated_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        )
        s.add(sub_stalled)

        await s.commit()
        sub_ac_id = sub_ac.id
        sub_pend_id = sub_pend.id
        sub_sample_id = sub_sample.id
        sub_stalled_id = sub_stalled.id

    # ── Test 1: rescore script validation ──
    # Check invalid UUID
    with patch("sys.exit") as mock_exit:
        await rescore("invalid-uuid")
        record("R7-01 rescore invalid UUID", "rescore", "cli", True, mock_exit.called, {}, "Should call sys.exit")

    # Check nonexistent UUID
    with patch("sys.exit") as mock_exit:
        await rescore(str(uuid.uuid4()))
        record("R7-02 rescore nonexistent ID", "rescore", "cli", True, mock_exit.called, {}, "Should call sys.exit")

    # Check non-ACCEPTED submission (PENDING status)
    with patch("sys.exit") as mock_exit:
        await rescore(str(sub_pend_id))
        record("R7-03 rescore non-ACCEPTED submission", "rescore", "cli", True, mock_exit.called, {}, "Should call sys.exit")

    # Check sample-only submission
    with patch("sys.exit") as mock_exit:
        await rescore(str(sub_sample_id))
        record("R7-04 rescore sample-only submission", "rescore", "cli", True, mock_exit.called, {}, "Should call sys.exit")

    # ── Test 2: Successful Rescore ──
    # Change problem score_base and bonus_max in database
    async with SessionLocal() as s:
        await s.execute(
            update(Problem)
            .where(Problem.id == problem_id)
            .values(score_base=200, runtime_bonus_max=50) # new bonus = 50 * 0.5 = 25. new score = 200 + 25 = 225.
        )
        await s.commit()

    # Clear delete tracking
    fake_redis_deleted.clear()

    # Call rescore
    print(f"Rescoring ACCEPTED submission: {sub_ac_id}")
    await rescore(str(sub_ac_id))

    # Verify score updated in submission and user stats
    async with SessionLocal() as s:
        sub_refreshed = (await s.execute(select(Submission).where(Submission.id == sub_ac_id))).scalar_one()
        stats_refreshed = (await s.execute(select(UserStats).where(UserStats.user_id == user_id))).scalar_one()
        
        record("R7-05 rescore updates submission score", "DB", "submissions", 225, sub_refreshed.score, {}, "Should be 225")
        record("R7-06 rescore updates user total_score", "DB", "user_stats", 225, stats_refreshed.total_score, {}, "Should be 225")

    # Verify Redis cache invalidated
    cache_invalidated = "leaderboard:all" in fake_redis_deleted and "leaderboard:week" in fake_redis_deleted
    record("R7-07 rescore invalidates cache", "Redis", "delete", True, cache_invalidated, {}, f"Deleted keys: {fake_redis_deleted}")

    # ── Test 3: Worker Reclaim ──
    # Patch SubmissionWorker's SessionLocal to use our SessionLocal
    from app.workers.submission_worker import SubmissionWorker
    
    with patch("app.workers.submission_worker.AsyncSessionLocal", SessionLocal), \
         patch("app.workers.submission_worker.aioredis.from_url", return_value=fake_redis):
        worker = SubmissionWorker()
        
        # Clear queue tracking
        fake_redis_queue.clear()
        
        # Run reclaim
        await worker.reclaim_stale()
        
        # Verify database status reset to PENDING
        async with SessionLocal() as s:
            sub_stalled_refreshed = (await s.execute(select(Submission).where(Submission.id == sub_stalled_id))).scalar_one()
            record("R7-08 reclaim resets status to PENDING", "DB", "submissions", SubmissionStatus.PENDING, sub_stalled_refreshed.status, {}, "Should reset to PENDING")

        # Verify queued in Redis
        queue_ok = len(fake_redis_queue) == 1 and fake_redis_queue[0][0] == "submission_queue"
        payload_ok = False
        if queue_ok:
            payload = json.loads(fake_redis_queue[0][1])
            payload_ok = payload.get("submission_id") == str(sub_stalled_id)
        record("R7-09 reclaim re-queues in Redis", "Redis", "lpush", True, queue_ok and payload_ok, {}, f"Queue: {fake_redis_queue}")

    out_path = Path("api_round_7_raw_results.json")
    out_path.write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    passed = sum(1 for r in RESULTS if r["passed"])
    print(f"\nRound 7: {passed}/{len(RESULTS)} checks passed")
    return RESULTS

if __name__ == "__main__":
    asyncio.run(run_round_7())
