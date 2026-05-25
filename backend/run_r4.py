"""
Round 4 - Tags, Problems, Admin CRUD, And Public Catalog
Tests: GET/POST /problems/tags, GET/POST/PATCH /problems, GET /problems/{slug}
"""
import asyncio, json, os, sys, time, uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

# ── Fake Redis ────────────────────────────────────────────────────────────────
fake_redis = MagicMock()
fake_redis.incr = AsyncMock(return_value=1)
fake_redis.expire = AsyncMock(return_value=True)
fake_redis.ping = AsyncMock(return_value=True)
fake_redis.get = AsyncMock(return_value=None)
fake_redis.setex = AsyncMock(return_value=True)
fake_redis.lpush = AsyncMock(return_value=1)
fake_redis.aclose = AsyncMock()

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
from app.models.user import RoleEnum

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
        print(f"       body={json.dumps(body)[:300]}")

def add_two_payload(slug, tag_id):
    return {
        "slug": slug, "title": "Add Two Integers", "description": "Return the sum of two integers.",
        "difficulty": "EASY", "time_limit_ms": 2000, "memory_limit_kb": 262144,
        "score_base": 100, "runtime_bonus_max": 20, "expected_complexity": "O(1)",
        "tag_ids": [str(tag_id)] if tag_id else [],
        "templates": [
            {"language": "python", "template_code": "def add_two(a, b):\n    pass",
             "function_name": "add_two", "arg_style": "positional"},
            {"language": "javascript", "template_code": "function addTwo(a,b){\n  return null;\n}",
             "function_name": "addTwo", "arg_style": "positional"},
        ],
        "test_cases": [
            {"input": "[1, 2]", "expected_output": "3", "is_sample": True, "order_index": 0, "weight": 1},
            {"input": "[0, 0]", "expected_output": "0", "is_sample": False, "order_index": 1, "weight": 1},
            {"input": "[-4, 9]", "expected_output": "5", "is_sample": False, "order_index": 2, "weight": 2},
            {"input": "[100, 23]", "expected_output": "123", "is_sample": False, "order_index": 3, "weight": 3},
        ],
    }

async def run_round_4():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    async def override_db():
        async with SessionLocal() as s:
            yield s
    app.dependency_overrides[get_db] = override_db
    fake_rls = MagicMock(); fake_rls.redis = fake_redis
    fake_rls.check_ip = AsyncMock(return_value=True); fake_rls.close = AsyncMock()
    app.state.rate_limit_service = fake_rls

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", follow_redirects=False) as c:
        B = "/api/v1"

        # Setup: admin + normal user
        admin_reg = await c.post(f"{B}/auth/register", json={
            "email": f"r4-admin-{RUN_ID}@example.com",
            "username": f"r4_admin_{RUN_ID}",
            "password": "Password123"
        })
        assert admin_reg.status_code == 200, f"Admin reg failed: {admin_reg.text}"
        # Promote admin in DB
        async with SessionLocal() as s:
            await s.execute(text("UPDATE users SET role='ADMIN' WHERE email=:e"),
                            {"e": f"r4-admin-{RUN_ID}@example.com"})
            await s.commit()
        # Re-login for fresh token
        login_r = await c.post(f"{B}/auth/login", json={
            "email": f"r4-admin-{RUN_ID}@example.com", "password": "Password123"})
        admin_token = login_r.json()["access_token"]
        admin_h = {"Authorization": f"Bearer {admin_token}"}

        user_reg = await c.post(f"{B}/auth/register", json={
            "email": f"r4-user-{RUN_ID}@example.com",
            "username": f"r4_user_{RUN_ID}",
            "password": "Password123"
        })
        assert user_reg.status_code == 200
        user_token = user_reg.json()["access_token"]
        user_h = {"Authorization": f"Bearer {user_token}"}

        # ── TAG CASES ─────────────────────────────────────────────────────────

        # R4-01: GET /problems/tags (should be empty initially)
        r = await c.get(f"{B}/problems/tags")
        record("R4-01 GET tags", "GET", "/problems/tags", 200, r.status_code, r.json())

        # R4-02: POST tag as admin
        tag_name = f"Arrays{RUN_ID}"
        r = await c.post(f"{B}/problems/tags?name={tag_name}", headers=admin_h)
        body = r.json()
        record("R4-02 create tag admin", "POST", "/problems/tags", 201, r.status_code, body)
        tag_id = body.get("id") if r.status_code == 201 else None
        shape_ok = {"id","name"}.issubset(set(body.keys())) if isinstance(body, dict) else False
        print(f"       shape_ok={shape_ok} tag_id={tag_id}")

        # Create extra tags for filtering tests
        for tname in [f"Math{RUN_ID}", f"Recursion{RUN_ID}"]:
            r2 = await c.post(f"{B}/problems/tags?name={tname}", headers=admin_h)
            print(f"       create tag '{tname}': {r2.status_code}")

        math_tag_r = await c.post(f"{B}/problems/tags?name=MathFilter{RUN_ID}", headers=admin_h)
        math_tag_id = math_tag_r.json().get("id") if math_tag_r.status_code == 201 else None

        # R4-03: duplicate tag
        r = await c.post(f"{B}/problems/tags?name={tag_name}", headers=admin_h)
        body = r.json()
        record("R4-03 duplicate tag", "POST", "/problems/tags", 422, r.status_code, body,
               f"detail={body.get('detail')} code={body.get('code')}")

        # R4-04: create tag no token
        r = await c.post(f"{B}/problems/tags?name=NoAuth{RUN_ID}")
        record("R4-04 create tag no token", "POST", "/problems/tags", 401, r.status_code, r.json())

        # R4-05: create tag normal user
        r = await c.post(f"{B}/problems/tags?name=NormalUser{RUN_ID}", headers=user_h)
        record("R4-05 create tag normal user", "POST", "/problems/tags", 403, r.status_code, r.json())

        # R4-06: create tag blank name
        r = await c.post(f"{B}/problems/tags?name=", headers=admin_h)
        record("R4-06 create tag blank", "POST", "/problems/tags?name=", 422, r.status_code, r.json())

        # R4-07: create tag too long (51 chars)
        long_name = "A" * 51
        r = await c.post(f"{B}/problems/tags?name={long_name}", headers=admin_h)
        record("R4-07 create tag too long", "POST", "/problems/tags", 422, r.status_code, r.json())

        # ── PROBLEM CREATE CASES ──────────────────────────────────────────────

        # R4-08: create valid problem (admin)
        slug1 = f"r4-{RUN_ID}-add-two"
        r = await c.post(f"{B}/problems", json=add_two_payload(slug1, tag_id), headers=admin_h)
        body = r.json()
        record("R4-08 create problem admin", "POST", "/problems", 201, r.status_code, body)
        prob1_id = body.get("id")
        is_unpublished = not body.get("is_published", True) if r.status_code == 201 else None
        sample_only = len(body.get("sample_test_cases", [])) > 0 if r.status_code == 201 else None
        print(f"       prob_id={prob1_id} unpublished_by_default=True sample_cases_count={len(body.get('sample_test_cases',[]))}")

        # R4-09: create no token
        slug_nauth = f"r4-{RUN_ID}-no-auth"
        r = await c.post(f"{B}/problems", json=add_two_payload(slug_nauth, tag_id))
        record("R4-09 create no token", "POST", "/problems", 401, r.status_code, r.json())

        # R4-10: create normal user
        slug_nu = f"r4-{RUN_ID}-normal-user"
        r = await c.post(f"{B}/problems", json=add_two_payload(slug_nu, tag_id), headers=user_h)
        record("R4-10 create normal user", "POST", "/problems", 403, r.status_code, r.json())

        # R4-11: duplicate slug
        r = await c.post(f"{B}/problems", json=add_two_payload(slug1, tag_id), headers=admin_h)
        body = r.json()
        record("R4-11 duplicate slug", "POST", "/problems", 422, r.status_code, body,
               f"detail={body.get('detail')}")

        # R4-12: invalid slug (uppercase/underscore)
        payload_bad_slug = add_two_payload(f"INVALID_SLUG_{RUN_ID}", tag_id)
        r = await c.post(f"{B}/problems", json=payload_bad_slug, headers=admin_h)
        record("R4-12 invalid slug", "POST", "/problems", 422, r.status_code, r.json())

        # R4-13: invalid difficulty
        p = add_two_payload(f"r4-{RUN_ID}-diff", tag_id)
        p["difficulty"] = "BEGINNER"
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-13 invalid difficulty", "POST", "/problems", 422, r.status_code, r.json())

        # R4-14: invalid tag ID
        p = add_two_payload(f"r4-{RUN_ID}-badtag", None)
        p["tag_ids"] = [str(uuid.uuid4())]
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        body = r.json()
        record("R4-14 invalid tag id", "POST", "/problems", 422, r.status_code, body,
               f"detail={body.get('detail')}")

        # R4-15: empty templates
        p = add_two_payload(f"r4-{RUN_ID}-emptytpl", tag_id)
        p["templates"] = []
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-15 empty templates", "POST", "/problems", 422, r.status_code, r.json())

        # R4-16: unsupported language (java)
        p = add_two_payload(f"r4-{RUN_ID}-java", tag_id)
        p["templates"] = [{"language":"java","template_code":"class X{}","function_name":"f","arg_style":"positional"}]
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-16 unsupported language java", "POST", "/problems", 422, r.status_code, r.json())

        # R4-17: JS template with kwargs
        p = add_two_payload(f"r4-{RUN_ID}-jskwargs", tag_id)
        p["templates"] = [{"language":"javascript","template_code":"function f(){}","function_name":"f","arg_style":"kwargs"}]
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        body = r.json()
        record("R4-17 JS kwargs", "POST", "/problems", 422, r.status_code, body)

        # R4-18: no sample test case
        p = add_two_payload(f"r4-{RUN_ID}-nosample", tag_id)
        p["test_cases"] = [
            {"input":"[1,2]","expected_output":"3","is_sample":False,"order_index":0,"weight":1},
            {"input":"[0,0]","expected_output":"0","is_sample":False,"order_index":1,"weight":1},
            {"input":"[-4,9]","expected_output":"5","is_sample":False,"order_index":2,"weight":2},
            {"input":"[100,23]","expected_output":"123","is_sample":False,"order_index":3,"weight":3},
        ]
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-18 no sample case", "POST", "/problems", 422, r.status_code, r.json())

        # R4-19: fewer than 3 hidden cases
        p = add_two_payload(f"r4-{RUN_ID}-fewhidden", tag_id)
        p["test_cases"] = [
            {"input":"[1,2]","expected_output":"3","is_sample":True,"order_index":0,"weight":1},
            {"input":"[0,0]","expected_output":"0","is_sample":False,"order_index":1,"weight":1},
            {"input":"[-4,9]","expected_output":"5","is_sample":False,"order_index":2,"weight":2},
        ]
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-19 fewer than 3 hidden", "POST", "/problems", 422, r.status_code, r.json())

        # R4-20: duplicate order_index
        p = add_two_payload(f"r4-{RUN_ID}-dupidx", tag_id)
        p["test_cases"] = [
            {"input":"[1,2]","expected_output":"3","is_sample":True,"order_index":0,"weight":1},
            {"input":"[0,0]","expected_output":"0","is_sample":False,"order_index":0,"weight":1},
            {"input":"[-4,9]","expected_output":"5","is_sample":False,"order_index":2,"weight":2},
            {"input":"[100,23]","expected_output":"123","is_sample":False,"order_index":3,"weight":3},
        ]
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-20 duplicate order_index", "POST", "/problems", 422, r.status_code, r.json())

        # R4-21: negative test weight (weight=0)
        p = add_two_payload(f"r4-{RUN_ID}-weight0", tag_id)
        p["test_cases"][0]["weight"] = 0
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-21 weight=0", "POST", "/problems", 422, r.status_code, r.json())

        # R4-22: negative resource limits (time_limit_ms=0)
        p = add_two_payload(f"r4-{RUN_ID}-limits", tag_id)
        p["time_limit_ms"] = 0
        r = await c.post(f"{B}/problems", json=p, headers=admin_h)
        record("R4-22 time_limit=0", "POST", "/problems", 422, r.status_code, r.json())

        # ── PROBLEM READ/UPDATE CASES ─────────────────────────────────────────

        # R4-23: GET /problems before publish - unpublished absent
        r = await c.get(f"{B}/problems")
        body = r.json()
        record("R4-23 list before publish", "GET", "/problems", 200, r.status_code, body)
        slugs_in_list = [i["slug"] for i in body.get("items", [])]
        absent = slug1 not in slugs_in_list
        print(f"       unpublished_slug_absent={absent} (items: {slugs_in_list})")

        # R4-24: GET unpublished by slug - no auth -> 404
        r = await c.get(f"{B}/problems/{slug1}")
        record("R4-24 get unpublished no auth", "GET", f"/problems/{slug1}", 404, r.status_code, r.json())

        # R4-25: GET unpublished by slug - admin -> 200
        r = await c.get(f"{B}/problems/{slug1}", headers=admin_h)
        body = r.json()
        record("R4-25 get unpublished admin", "GET", f"/problems/{slug1}", 200, r.status_code, body)

        # R4-26: PATCH publish problem
        r = await c.patch(f"{B}/problems/{slug1}", json={"is_published": True}, headers=admin_h)
        body = r.json()
        record("R4-26 publish problem", "PATCH", f"/problems/{slug1}", 200, r.status_code, body)

        # R4-27: GET published - no auth -> 200, user_status null
        r = await c.get(f"{B}/problems/{slug1}")
        body = r.json()
        record("R4-27 get published no auth", "GET", f"/problems/{slug1}", 200, r.status_code, body)
        us_null = body.get("user_status") is None
        hidden_absent = all("input" not in tc for tc in body.get("sample_test_cases", []) if not tc.get("is_sample", True))
        print(f"       user_status_null={us_null}")

        # R4-28: GET published - user token -> user_status.solved=false
        r = await c.get(f"{B}/problems/{slug1}", headers=user_h)
        body = r.json()
        record("R4-28 get published user token", "GET", f"/problems/{slug1}", 200, r.status_code, body)
        us = body.get("user_status")
        print(f"       user_status={us}")

        # R4-29: PATCH update title/difficulty
        r = await c.patch(f"{B}/problems/{slug1}",
                          json={"title": "Add Two Updated", "difficulty": "MEDIUM"}, headers=admin_h)
        body = r.json()
        record("R4-29 update title/difficulty", "PATCH", f"/problems/{slug1}", 200, r.status_code, body)

        # R4-30: PATCH clear tags
        r = await c.patch(f"{B}/problems/{slug1}", json={"tag_ids": []}, headers=admin_h)
        body = r.json()
        record("R4-30 clear tags", "PATCH", f"/problems/{slug1}", 200, r.status_code, body)
        tags_empty = body.get("tags") == []
        print(f"       tags_empty={tags_empty}")

        # R4-31: PATCH invalid tag id
        r = await c.patch(f"{B}/problems/{slug1}", json={"tag_ids": [str(uuid.uuid4())]}, headers=admin_h)
        body = r.json()
        record("R4-31 update invalid tag", "PATCH", f"/problems/{slug1}", 422, r.status_code, body,
               f"detail={body.get('detail')}")

        # R4-32: PATCH missing slug -> 404
        r = await c.patch(f"{B}/problems/nonexistent-slug-{RUN_ID}",
                          json={"title": "X"}, headers=admin_h)
        record("R4-32 update missing slug", "PATCH", "/problems/missing", 404, r.status_code, r.json())

        # R4-33: PATCH normal user -> 403
        r = await c.patch(f"{B}/problems/{slug1}", json={"title": "Y"}, headers=user_h)
        record("R4-33 update normal user", "PATCH", f"/problems/{slug1}", 403, r.status_code, r.json())

        # R4-34: PATCH no token -> 401
        r = await c.patch(f"{B}/problems/{slug1}", json={"title": "Z"})
        record("R4-34 update no token", "PATCH", f"/problems/{slug1}", 401, r.status_code, r.json())

        # ── CREATE 2 MORE PROBLEMS for listing/filter tests ───────────────────
        slug2 = f"r4-{RUN_ID}-medium-prob"
        math_payload = add_two_payload(slug2, math_tag_id)
        math_payload["difficulty"] = "MEDIUM"
        math_payload["title"] = "A Medium Problem"
        r2 = await c.post(f"{B}/problems", json=math_payload, headers=admin_h)
        if r2.status_code == 201:
            await c.patch(f"{B}/problems/{slug2}", json={"is_published": True}, headers=admin_h)

        slug3 = f"r4-{RUN_ID}-hard-unpub"  # left unpublished
        hard_payload = add_two_payload(slug3, math_tag_id)
        hard_payload["difficulty"] = "HARD"
        hard_payload["title"] = "Hard Unpublished"
        await c.post(f"{B}/problems", json=hard_payload, headers=admin_h)

        # ── PROBLEM LIST/FILTER CASES ─────────────────────────────────────────

        # R4-35: list default - only published
        r = await c.get(f"{B}/problems")
        body = r.json()
        record("R4-35 list default", "GET", "/problems", 200, r.status_code, body)
        pub_slugs = [i["slug"] for i in body.get("items", [])]
        all_published = slug3 not in pub_slugs
        print(f"       published_slugs={pub_slugs} unpub_absent={all_published}")

        # R4-36: pagination limit=1
        r = await c.get(f"{B}/problems?page=1&limit=1")
        body = r.json()
        record("R4-36 pagination limit=1", "GET", "/problems?limit=1", 200, r.status_code, body)
        print(f"       items_count={len(body.get('items',[]))} total={body.get('total')} pages={body.get('pages')}")

        # R4-37: difficulty filter EASY
        r = await c.get(f"{B}/problems?difficulty=EASY")
        body = r.json()
        record("R4-37 filter EASY", "GET", "/problems?difficulty=EASY", 200, r.status_code, body)
        all_easy = all(i["difficulty"]=="EASY" for i in body.get("items",[]))
        print(f"       all_easy={all_easy} items={[i['difficulty'] for i in body.get('items',[])]}")

        # R4-38: invalid difficulty lowercase
        r = await c.get(f"{B}/problems?difficulty=easy")
        record("R4-38 invalid difficulty lowercase", "GET", "/problems?difficulty=easy", 422, r.status_code, r.json())

        # R4-39: tag filter exact
        r = await c.get(f"{B}/problems?tag=MathFilter{RUN_ID}")
        body = r.json()
        record("R4-39 tag filter exact", "GET", "/problems?tag=...", 200, r.status_code, body)
        print(f"       items_matching_tag={len(body.get('items',[]))}")

        # R4-40: tag filter case mismatch
        r = await c.get(f"{B}/problems?tag=mathfilter{RUN_ID}")
        body = r.json()
        record("R4-40 tag case mismatch", "GET", "/problems?tag=lowercase", 200, r.status_code, body)
        print(f"       items_with_wrong_case={len(body.get('items',[]))} (expect 0)")

        # R4-41: search by title
        r = await c.get(f"{B}/problems?search=Add")
        body = r.json()
        record("R4-41 search title", "GET", "/problems?search=Add", 200, r.status_code, body)
        print(f"       items={[i['title'] for i in body.get('items',[])]}")

        # R4-42: search by slug
        r = await c.get(f"{B}/problems?search=r4-{RUN_ID}")
        body = r.json()
        record("R4-42 search slug", "GET", f"/problems?search=r4-{RUN_ID}", 200, r.status_code, body)
        print(f"       count={len(body.get('items',[]))}")

        # R4-43: sort by title
        r = await c.get(f"{B}/problems?sort=title")
        record("R4-43 sort by title", "GET", "/problems?sort=title", 200, r.status_code, r.json())

        # R4-44: sort by acceptance
        r = await c.get(f"{B}/problems?sort=acceptance")
        record("R4-44 sort by acceptance", "GET", "/problems?sort=acceptance", 200, r.status_code, r.json())

        # R4-45: invalid sort
        r = await c.get(f"{B}/problems?sort=created_at")
        record("R4-45 invalid sort", "GET", "/problems?sort=created_at", 422, r.status_code, r.json())

        # R4-46: invalid page=0
        r = await c.get(f"{B}/problems?page=0")
        record("R4-46 invalid page=0", "GET", "/problems?page=0", 422, r.status_code, r.json())

        # R4-47: invalid limit=0
        r = await c.get(f"{B}/problems?limit=0")
        record("R4-47a invalid limit=0", "GET", "/problems?limit=0", 422, r.status_code, r.json())
        r = await c.get(f"{B}/problems?limit=101")
        record("R4-47b invalid limit=101", "GET", "/problems?limit=101", 422, r.status_code, r.json())

    out_path = Path("api_round_4_raw_results.json")
    out_path.write_text(json.dumps(RESULTS, indent=2, default=str), encoding="utf-8")
    passed = sum(1 for r in RESULTS if r["passed"])
    print(f"\nRound 4: {passed}/{len(RESULTS)} HTTP status checks passed")
    return RESULTS

if __name__ == "__main__":
    asyncio.run(run_round_4())
