# XYZ Platform API Test Rounds

Generated from the current backend implementation in `backend/app` on 2026-05-25.

Use this file as the handoff document for an API-testing agent. The command "Execute round X" means: read the source files listed below, prepare the fixtures for that round, run every case in the round, review actual responses against the expected status/body shape, and write a report named `api_round_X_report.md`.

## Source Files To Inspect Before Any Round

The testing agent must inspect these files before running a round, because they define the real API behavior:

- `backend/app/main.py`
- `backend/app/routers/health.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/users.py`
- `backend/app/routers/problems.py`
- `backend/app/routers/submissions.py`
- `backend/app/routers/leaderboard.py`
- `backend/app/schemas/auth.py`
- `backend/app/schemas/user.py`
- `backend/app/schemas/problem.py`
- `backend/app/schemas/submission.py`
- `backend/app/controllers/*.py`
- `backend/app/services/*.py`
- `backend/app/repositories/*.py`
- `backend/app/models/*.py`
- `backend/tests/*.py`

## Environment Contract

Default API base URL:

```text
http://localhost:8000/api/v1
```

Default database and Redis settings from `backend/app/core/config.py`:

```text
DATABASE_URL=postgresql+asyncpg://xyz_platform:xyz_platform@localhost:5432/xyz_platform
REDIS_URL=redis://localhost:6379/0
JUDGE0_URL=http://localhost:2358
```

Suggested local startup from PowerShell:

```powershell
cd backend
docker compose up -d postgres redis judge0-db judge0-redis judge0-server judge0-workers
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

For submission rounds, run the worker in a second terminal:

```powershell
cd backend
python -m app.workers.submission_worker
```

If the local machine does not expose `python`, use the workspace or project interpreter. The agent must state in the round report which interpreter and services were used.

## Global Response Rules

Validate exact status codes and response shapes. UUIDs, timestamps, JWTs, ordering among equal-ranked leaderboard rows, runtime, and memory values are dynamic.

Generic exception envelope:

```json
{
  "detail": "message or validation error list",
  "code": "ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | RATE_LIMIT | VALIDATION_ERROR | INTERNAL_ERROR"
}
```

Important current behavior:

- Pydantic/request validation returns `422` with `code: "VALIDATION_ERROR"` and `detail` as a list.
- Controller-raised `HTTPException(422, "...")` returns `422` with `code: "ERROR"` and `detail` as a string.
- Missing or invalid bearer token returns `401` with `code: "UNAUTHORIZED"`.
- Non-admin access returns `403` with `code: "FORBIDDEN"`.
- Missing resources return `404` with `code: "NOT_FOUND"`.
- Rate limits return `429` with `code: "RATE_LIMIT"`.
- The leaderboard endpoint is mounted at `/api/v1/leaderboard/` with a trailing slash.
- Tags are mounted at `/api/v1/problems/tags`, not `/api/v1/tags`.
- Admin problem operations are mounted under `/api/v1/problems`, not `/api/v1/admin`.
- No endpoint exists to create an admin user. The agent must register a normal user and promote it directly in the DB for admin-route tests.

## Route Map

| Method | Path | Auth | Main expected success |
| --- | --- | --- | --- |
| GET | `/health` | none | `200 {status, db, redis, judge0}` |
| POST | `/auth/register` | none | `200 Token` |
| POST | `/auth/login` | none | `200 Token` |
| GET | `/users/me` | user | `200 UserProfile` |
| PATCH | `/users/me` | user | `200 UserProfile` |
| GET | `/users/me/stats` | user | `200 stats object` |
| GET | `/users/me/submissions` | user | `200 paginated submissions` |
| GET | `/problems` | optional user | `200 PaginatedProblems` |
| GET | `/problems/tags` | none | `200 TagResponse[]` |
| POST | `/problems/tags?name=...` | admin | `201 TagResponse` |
| POST | `/problems` | admin | `201 ProblemDetail`, unpublished by default |
| GET | `/problems/{slug}` | optional user | `200 ProblemDetail` if published or admin |
| PATCH | `/problems/{slug}` | admin | `200 ProblemDetail` |
| GET | `/problems/{slug}/submissions/best` | user | `200 BestSubmissionResponse` after full accepted submission |
| POST | `/submissions` | user | `202 {id, status}` |
| GET | `/submissions/{submission_id}` | owner | `200 SubmissionResponse` |
| GET | `/submissions/{submission_id}/results` | owner | `200 SubmissionResultResponse[]` |
| GET | `/leaderboard/` | none | `200 leaderboard row[]` |

## Common Test Fixtures

Use a unique `RUN_ID` for every round, for example `20260525T054000`. All emails, usernames, tags, and slugs should include that run id to avoid collisions.

Valid user:

```json
{
  "email": "round-{RUN_ID}-user@example.com",
  "username": "round_{RUN_ID}_user",
  "password": "Password123"
}
```

Valid admin registration body before DB promotion:

```json
{
  "email": "round-{RUN_ID}-admin@example.com",
  "username": "round_{RUN_ID}_admin",
  "password": "Password123"
}
```

Promote admin directly in the database:

```python
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(DATABASE_URL)
async with engine.begin() as conn:
    await conn.execute(
        text("UPDATE users SET role = 'ADMIN' WHERE email = :email"),
        {"email": admin_email},
    )
await engine.dispose()
```

Valid problem fixture for most rounds:

```json
{
  "slug": "round-{RUN_ID}-add-two",
  "title": "Add Two Integers",
  "description": "Return the sum of two integers.",
  "difficulty": "EASY",
  "time_limit_ms": 2000,
  "memory_limit_kb": 262144,
  "score_base": 100,
  "runtime_bonus_max": 20,
  "expected_complexity": "O(1)",
  "tag_ids": ["{TAG_ID}"],
  "templates": [
    {
      "language": "python",
      "template_code": "def add_two(a, b):\n    pass",
      "function_name": "add_two",
      "arg_style": "positional"
    },
    {
      "language": "javascript",
      "template_code": "function addTwo(a, b) {\n  return null;\n}",
      "function_name": "addTwo",
      "arg_style": "positional"
    }
  ],
  "test_cases": [
    {"input": "[1, 2]", "expected_output": "3", "is_sample": true, "order_index": 0, "weight": 1},
    {"input": "[0, 0]", "expected_output": "0", "is_sample": false, "order_index": 1, "weight": 1},
    {"input": "[-4, 9]", "expected_output": "5", "is_sample": false, "order_index": 2, "weight": 2},
    {"input": "[100, 23]", "expected_output": "123", "is_sample": false, "order_index": 3, "weight": 3}
  ]
}
```

Known submission source examples for that problem:

```python
# ACCEPTED python
def add_two(a, b):
    return a + b

# WRONG_ANSWER python
def add_two(a, b):
    return a - b

# RUNTIME_ERROR python
def add_two(a, b):
    raise RuntimeError("boom")

# COMPILE_ERROR python
def add_two(a, b)
    return a + b
```

```javascript
// ACCEPTED javascript
function addTwo(a, b) {
  return a + b;
}
```

## Curl Template

Use this curl style when manually executing any case:

```powershell
$BASE="http://localhost:8000/api/v1"
curl.exe -sS -X POST "$BASE/auth/register" `
  -H "Content-Type: application/json" `
  -d '{"email":"round-demo@example.com","username":"round_demo","password":"Password123"}'
```

Authenticated request:

```powershell
curl.exe -sS "$BASE/users/me" -H "Authorization: Bearer $TOKEN"
```

## Python Execution Harness

The agent may use this skeleton for any round. It intentionally verifies shape and prints all actual responses for human review. A round-specific agent can extend the `run_round_X` function while keeping the helper methods.

```python
import argparse
import asyncio
import json
import os
import time
import uuid
from pathlib import Path

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://xyz_platform:xyz_platform@localhost:5432/xyz_platform",
)


class ApiRound:
    def __init__(self, round_id: int):
        self.round_id = round_id
        self.run_id = os.getenv("RUN_ID") or str(int(time.time()))
        self.results = []
        self.client = httpx.AsyncClient(base_url=BASE_URL, timeout=30.0, follow_redirects=False)

    async def close(self):
        await self.client.aclose()

    async def request(self, name, method, path, *, expected, token=None, json_body=None, params=None, headers=None):
        h = {"Accept": "application/json"}
        if json_body is not None:
            h["Content-Type"] = "application/json"
        if token:
            h["Authorization"] = f"Bearer {token}"
        if headers:
            h.update(headers)
        response = await self.client.request(method, path, json=json_body, params=params, headers=h)
        try:
            body = response.json()
        except Exception:
            body = response.text
        passed = response.status_code == expected
        self.results.append({
            "name": name,
            "method": method,
            "path": path,
            "expected": expected,
            "actual": response.status_code,
            "passed": passed,
            "body": body,
        })
        return response, body

    async def register(self, label, email=None, username=None, password="Password123"):
        email = email or f"round-{self.round_id}-{self.run_id}-{label}@example.com"
        username = username or f"r{self.round_id}_{self.run_id}_{label}".replace("-", "_")
        resp, body = await self.request(
            f"register {label}",
            "POST",
            "/auth/register",
            expected=200,
            json_body={"email": email, "username": username, "password": password},
        )
        return {"email": email, "username": username, "token": body.get("access_token"), "user": body.get("user")}

    async def login(self, email, password="Password123", expected=200):
        _, body = await self.request(
            f"login {email}",
            "POST",
            "/auth/login",
            expected=expected,
            json_body={"email": email, "password": password},
        )
        return body.get("access_token") if isinstance(body, dict) else None

    async def promote_admin(self, email):
        engine = create_async_engine(DATABASE_URL)
        async with engine.begin() as conn:
            await conn.execute(text("UPDATE users SET role = 'ADMIN' WHERE email = :email"), {"email": email})
        await engine.dispose()

    async def create_admin(self):
        admin = await self.register("admin")
        await self.promote_admin(admin["email"])
        # Login again so the returned user role in the token response reflects current DB state when reviewed.
        admin["token"] = await self.login(admin["email"])
        return admin

    async def create_tag(self, token, name):
        _, body = await self.request(
            f"create tag {name}",
            "POST",
            "/problems/tags",
            params={"name": name},
            token=token,
            expected=201,
        )
        return body

    def add_two_problem_payload(self, slug, tag_id):
        return {
            "slug": slug,
            "title": "Add Two Integers",
            "description": "Return the sum of two integers.",
            "difficulty": "EASY",
            "time_limit_ms": 2000,
            "memory_limit_kb": 262144,
            "score_base": 100,
            "runtime_bonus_max": 20,
            "expected_complexity": "O(1)",
            "tag_ids": [tag_id],
            "templates": [
                {"language": "python", "template_code": "def add_two(a, b):\n    pass", "function_name": "add_two", "arg_style": "positional"},
                {"language": "javascript", "template_code": "function addTwo(a, b) {\n  return null;\n}", "function_name": "addTwo", "arg_style": "positional"},
            ],
            "test_cases": [
                {"input": "[1, 2]", "expected_output": "3", "is_sample": True, "order_index": 0, "weight": 1},
                {"input": "[0, 0]", "expected_output": "0", "is_sample": False, "order_index": 1, "weight": 1},
                {"input": "[-4, 9]", "expected_output": "5", "is_sample": False, "order_index": 2, "weight": 2},
                {"input": "[100, 23]", "expected_output": "123", "is_sample": False, "order_index": 3, "weight": 3},
            ],
        }

    async def create_published_add_two_problem(self, admin_token):
        tag = await self.create_tag(admin_token, f"Round{self.round_id}Tag{self.run_id}")
        slug = f"round-{self.round_id}-{self.run_id}-add-two".lower()
        _, problem = await self.request(
            f"create problem {slug}",
            "POST",
            "/problems",
            token=admin_token,
            expected=201,
            json_body=self.add_two_problem_payload(slug, tag["id"]),
        )
        await self.request(
            f"publish problem {slug}",
            "PATCH",
            f"/problems/{slug}",
            token=admin_token,
            expected=200,
            json_body={"is_published": True},
        )
        problem["slug"] = slug
        return problem

    async def submit(self, token, problem_id, source_code, *, language="python", run_samples_only=False, expected=202):
        _, body = await self.request(
            f"submit {language} samples={run_samples_only}",
            "POST",
            "/submissions",
            token=token,
            expected=expected,
            json_body={
                "problem_id": problem_id,
                "language": language,
                "source_code": source_code,
                "run_samples_only": run_samples_only,
            },
        )
        return body

    async def poll_submission(self, token, submission_id, timeout_seconds=60):
        terminal = {"ACCEPTED", "SAMPLE_PASSED", "WRONG_ANSWER", "TIME_LIMIT", "RUNTIME_ERROR", "COMPILE_ERROR", "MEMORY_LIMIT"}
        deadline = time.time() + timeout_seconds
        last = None
        while time.time() < deadline:
            _, body = await self.request(
                f"poll submission {submission_id}",
                "GET",
                f"/submissions/{submission_id}",
                token=token,
                expected=200,
            )
            last = body
            if body.get("status") in terminal:
                return body
            await asyncio.sleep(2)
        raise AssertionError(f"submission {submission_id} did not finish; last={last}")

    def write_results(self):
        path = Path(f"api_round_{self.round_id}_raw_results.json")
        path.write_text(json.dumps(self.results, indent=2, default=str), encoding="utf-8")
        passed = sum(1 for r in self.results if r["passed"])
        print(f"Round {self.round_id}: {passed}/{len(self.results)} HTTP status checks passed")
        print(f"Raw results written to {path}")
        for row in self.results:
            marker = "PASS" if row["passed"] else "FAIL"
            print(f"[{marker}] {row['name']} expected={row['expected']} actual={row['actual']}")
```

The round sections below are the source of truth for what each `run_round_X` implementation must test.

## Round 1 - Health And Registration

Purpose: verify system availability, global error envelopes, and user registration validation.

Endpoints covered:

- `GET /api/v1/health`
- `POST /api/v1/auth/register`

Agent setup:

- Start API dependencies.
- Use a fresh `RUN_ID`.
- Do not require an admin user.

Cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R1-01 | `GET /health` | none | `200`; body has `status` in `ok/degraded`, `db` in `ok/error`, `redis` in `ok/error`, `judge0` in `ok/error/skipped` |
| R1-02 | `POST /auth/register` | valid user | `200`; `access_token` string, `token_type: bearer`, user role `USER`, `is_active: true` |
| R1-03 | duplicate email | same email, new username | `422`; `detail: EMAIL_TAKEN`, `code: ERROR` |
| R1-04 | duplicate username | new email, same username | `422`; `detail: USERNAME_TAKEN`, `code: ERROR` |
| R1-05 | invalid email | `not-an-email` | `422`; `code: VALIDATION_ERROR` |
| R1-06 | username too short | `ab` | `422`; `code: VALIDATION_ERROR` |
| R1-07 | username invalid chars | `bad name!` | `422`; `code: VALIDATION_ERROR` |
| R1-08 | username too long | 51 chars | `422`; `code: VALIDATION_ERROR` |
| R1-09 | password too short | `Pass1` | `422`; `code: VALIDATION_ERROR` |
| R1-10 | password has no digit | `PasswordOnly` | `422`; `code: VALIDATION_ERROR`; message includes digit rule |
| R1-11 | password has no letter | `12345678` | `422`; `code: VALIDATION_ERROR`; message includes letter rule |
| R1-12 | missing required fields | `{}` | `422`; `code: VALIDATION_ERROR` |
| R1-13 | wrong content type/body | malformed JSON | `422`; `code: VALIDATION_ERROR` |
| R1-14 | wrong method | `GET /auth/register` | `405` method error |

Example valid registration output:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "<uuid>",
    "email": "round-{RUN_ID}-user@example.com",
    "username": "round_{RUN_ID}_user",
    "role": "USER",
    "avatar_url": null,
    "is_active": true,
    "created_at": "<iso-datetime>"
  }
}
```

Round 1 report must highlight dependency degradation separately from endpoint failures. For example, `status: degraded` with `judge0: error` is acceptable for auth-only work but must be noted before later submission rounds.

## Round 2 - Login, Tokens, And Profile Update

Purpose: verify login, JWT rejection paths, protected route behavior, and profile updates.

Endpoints covered:

- `POST /api/v1/auth/login`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

Agent setup:

- Register two normal users: `primary` and `secondary`.
- Keep both tokens.
- For inactive-user tests, direct DB update is allowed: `UPDATE users SET is_active = false WHERE email = :email`.

Cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R2-01 | `POST /auth/login` | correct email/password | `200 Token`; user matches registered user |
| R2-02 | login wrong password | correct email, bad password | `401`; `detail: Incorrect email or password`, `code: UNAUTHORIZED` |
| R2-03 | login unknown email | unknown email | `401`; same generic error |
| R2-04 | login invalid email shape | `bad-email` | `422`; `code: VALIDATION_ERROR` |
| R2-05 | login missing password | only email | `422`; `code: VALIDATION_ERROR` |
| R2-06 | `GET /users/me` | valid token | `200 UserProfile`; no password hash |
| R2-07 | `GET /users/me` | no token | `401`; `code: UNAUTHORIZED` |
| R2-08 | `GET /users/me` | `Bearer not-a-jwt` | `401`; `code: UNAUTHORIZED` |
| R2-09 | `GET /users/me` | tampered token | `401`; `code: UNAUTHORIZED` |
| R2-10 | `GET /users/me` | expired token created with app secret | `401`; `code: UNAUTHORIZED` |
| R2-11 | `GET /users/me` | inactive user's valid token | `403`; `detail: Inactive user`, `code: FORBIDDEN` |
| R2-12 | `PATCH /users/me` | `{"username":"round_{RUN_ID}_renamed"}` | `200`; username changed |
| R2-13 | `PATCH /users/me` | `{"avatar_url":"https://example.com/a.png"}` | `200`; avatar updated |
| R2-14 | `PATCH /users/me` | duplicate username from secondary user | `422`; `detail: USERNAME_TAKEN`, `code: ERROR` |
| R2-15 | `PATCH /users/me` | username invalid chars | `422`; `code: VALIDATION_ERROR` |
| R2-16 | `PATCH /users/me` | username length 2 | `422`; `code: VALIDATION_ERROR` |
| R2-17 | `PATCH /users/me` | avatar URL length 513 | `422`; `code: VALIDATION_ERROR` |
| R2-18 | `PATCH /users/me` | empty `{}` after avatar is set | `200`; expected to preserve existing avatar. If it clears avatar, report as a bug. |

Example successful profile response:

```json
{
  "id": "<uuid>",
  "email": "round-{RUN_ID}-primary@example.com",
  "username": "round_{RUN_ID}_renamed",
  "role": "USER",
  "avatar_url": "https://example.com/a.png",
  "is_active": true,
  "created_at": "<iso-datetime>"
}
```

Round 2 report must include whether omitted PATCH fields are preserved. Current code should be inspected carefully because omitted `avatar_url` may be treated like `null`.

## Round 3 - User Stats And Personal Submission History

Purpose: verify user stats, empty submission history, authentication requirements, and pagination behavior before judging is introduced.

Endpoints covered:

- `GET /api/v1/users/me/stats`
- `GET /api/v1/users/me/submissions`

Agent setup:

- Register one fresh user.
- No problem or submission setup is required for the first half of this round.

Cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R3-01 | `GET /users/me/stats` | valid token, new user | `200`; all numeric counters `0`, `last_active_date: null` |
| R3-02 | stats no token | none | `401`; `code: UNAUTHORIZED` |
| R3-03 | stats bad token | invalid JWT | `401`; `code: UNAUTHORIZED` |
| R3-04 | `GET /users/me/submissions` | valid token, no submissions | `200`; `items: []`, `total: 0`, `page: 1`, `limit: 20`, `pages: 0` |
| R3-05 | submissions custom pagination | `?page=2&limit=5` | `200`; empty items, `page: 2`, `limit: 5`, `pages: 0` |
| R3-06 | submissions no token | none | `401`; `code: UNAUTHORIZED` |
| R3-07 | submissions bad token | invalid JWT | `401`; `code: UNAUTHORIZED` |
| R3-08 | submissions invalid page | `?page=0&limit=20` | Contract expectation: `422`. If actual is `200` or `500`, report missing query validation. |
| R3-09 | submissions invalid limit | `?page=1&limit=0` | Contract expectation: `422`. If actual is `500`, report division-by-zero risk. |
| R3-10 | submissions excessive limit | `?limit=500` | Contract expectation: `422` or capped limit. If actual returns `limit: 500`, report missing max-limit validation. |

Expected new-user stats:

```json
{
  "total_solved": 0,
  "easy_solved": 0,
  "medium_solved": 0,
  "hard_solved": 0,
  "total_score": 0,
  "current_streak": 0,
  "best_streak": 0,
  "last_active_date": null
}
```

Round 3 report must call out any pagination behavior that differs from `/problems`, where `page` and `limit` are constrained by FastAPI `Query`.

## Round 4 - Tags, Problems, Admin CRUD, And Public Catalog

Purpose: verify all problem and tag management behavior, including admin authorization, schema validation, publish state, list filters, and hidden test case exposure.

Endpoints covered:

- `GET /api/v1/problems/tags`
- `POST /api/v1/problems/tags?name=...`
- `GET /api/v1/problems`
- `POST /api/v1/problems`
- `GET /api/v1/problems/{slug}`
- `PATCH /api/v1/problems/{slug}`

Agent setup:

- Register and DB-promote one admin user.
- Register one normal user.
- Create at least three tags: `Arrays{RUN_ID}`, `Math{RUN_ID}`, `Recursion{RUN_ID}`.
- Create at least three problems with distinct difficulty/title/tag combinations.
- Publish at least two; leave at least one unpublished.

Tag cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R4-01 | `GET /problems/tags` | none | `200`; array sorted by name |
| R4-02 | `POST /problems/tags` | admin, `name=Arrays{RUN_ID}` | `201`; `{id, name}` |
| R4-03 | duplicate tag | same name | `422`; `detail: TAG_EXISTS`, `code: ERROR` |
| R4-04 | create tag no token | name query | `401`; `code: UNAUTHORIZED` |
| R4-05 | create tag normal user | name query | `403`; `code: FORBIDDEN` |
| R4-06 | create tag blank | `name=` | `422`; `code: VALIDATION_ERROR` |
| R4-07 | create tag too long | 51 chars | `422`; `code: VALIDATION_ERROR` |

Problem create validation cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R4-08 | `POST /problems` | valid admin payload | `201`; unpublished detail; only `sample_test_cases` exposed |
| R4-09 | create no token | valid payload | `401`; `code: UNAUTHORIZED` |
| R4-10 | create normal user | valid payload | `403`; `code: FORBIDDEN` |
| R4-11 | duplicate slug | same slug | `422`; `detail: SLUG_TAKEN`, `code: ERROR` |
| R4-12 | invalid slug | uppercase/underscore/space | `422`; `code: VALIDATION_ERROR` |
| R4-13 | invalid difficulty | `BEGINNER` | `422`; `code: VALIDATION_ERROR` |
| R4-14 | invalid tag id | random UUID | `422`; `detail: INVALID_TAG_ID`, `code: ERROR` |
| R4-15 | empty templates | `templates: []` | `422`; `code: VALIDATION_ERROR` |
| R4-16 | unsupported template language | `java` | `422`; `code: VALIDATION_ERROR` |
| R4-17 | JS template with `arg_style: kwargs` | javascript kwargs | `422`; validation message says JS cannot use kwargs |
| R4-18 | no sample test case | all hidden | `422`; validation message says at least 1 sample required |
| R4-19 | fewer than 3 hidden cases | 1 sample + 2 hidden | `422`; validation message says at least 3 hidden required |
| R4-20 | duplicate `order_index` | repeated index | `422`; validation message says order index unique |
| R4-21 | negative test weight | `weight: 0` | `422`; `code: VALIDATION_ERROR` |
| R4-22 | negative resource limits | `time_limit_ms: 0`, `memory_limit_kb: 0` | `422`; `code: VALIDATION_ERROR` |

Problem read/update cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R4-23 | `GET /problems` before publish | no auth | created unpublished problem absent from list |
| R4-24 | `GET /problems/{slug}` unpublished | no auth | `404`; hidden from public |
| R4-25 | `GET /problems/{slug}` unpublished | admin token | `200`; admin can inspect |
| R4-26 | `PATCH /problems/{slug}` | `{"is_published": true}` admin | `200`; now public |
| R4-27 | `GET /problems/{slug}` published | no auth | `200`; `user_status: null`; hidden test I/O absent |
| R4-28 | `GET /problems/{slug}` published | normal user token | `200`; `user_status: {"solved": false, "best_score": null}` |
| R4-29 | `PATCH /problems/{slug}` | update title/difficulty/limits | `200`; fields changed |
| R4-30 | clear tags | `{"tag_ids":[]}` | `200`; `tags: []` |
| R4-31 | update invalid tag | random UUID | `422`; `detail: INVALID_TAG_ID` |
| R4-32 | update missing slug | any body | `404`; `detail: Problem not found` |
| R4-33 | update normal user | any body | `403`; `code: FORBIDDEN` |
| R4-34 | update no token | any body | `401`; `code: UNAUTHORIZED` |

Problem list/filter cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R4-35 | list default | none | `200`; only published problems; `page: 1`, `limit: 20` |
| R4-36 | pagination | `?page=1&limit=1` | `200`; one item, correct `total` and `pages` |
| R4-37 | difficulty filter | `?difficulty=EASY` | only EASY published problems |
| R4-38 | invalid difficulty | `?difficulty=easy` | `422`; enum is uppercase only |
| R4-39 | tag filter exact | `?tag=Math{RUN_ID}` | matching published problems |
| R4-40 | tag filter case mismatch | wrong case | `200`; usually empty because match is case-sensitive |
| R4-41 | search by title | `?search=Add` | title/slug matches |
| R4-42 | search by slug | `?search=round-{RUN_ID}` | slug matches |
| R4-43 | sort by title | `?sort=title` | title ascending |
| R4-44 | sort by acceptance | `?sort=acceptance` | acceptance desc, nulls last, title tie-break |
| R4-45 | invalid sort | `?sort=created_at` | `422`; `code: VALIDATION_ERROR` |
| R4-46 | invalid page | `?page=0` | `422`; `code: VALIDATION_ERROR` |
| R4-47 | invalid limit low/high | `?limit=0` and `?limit=101` | `422`; `code: VALIDATION_ERROR` |

Example successful problem detail:

```json
{
  "id": "<uuid>",
  "slug": "round-{RUN_ID}-add-two",
  "title": "Add Two Integers",
  "description": "Return the sum of two integers.",
  "difficulty": "EASY",
  "time_limit_ms": 2000,
  "memory_limit_kb": 262144,
  "score_base": 100,
  "runtime_bonus_max": 20,
  "expected_complexity": "O(1)",
  "acceptance_rate": null,
  "tags": [{"id": "<uuid>", "name": "Math{RUN_ID}"}],
  "templates": [{"id": "<uuid>", "language": "python", "template_code": "...", "function_name": "add_two", "arg_style": "positional"}],
  "sample_test_cases": [{"id": "<uuid>", "is_sample": true, "order_index": 0, "weight": 1, "input": "[1, 2]", "expected_output": "3"}],
  "user_status": null
}
```

Round 4 report must explicitly confirm hidden test cases are not exposed in problem detail.

## Round 5 - Submissions, Worker Results, Best Submission

Purpose: verify submission creation, async judging, result visibility, owner isolation, scoring, and best-submission behavior.

Endpoints covered:

- `POST /api/v1/submissions`
- `GET /api/v1/submissions/{submission_id}`
- `GET /api/v1/submissions/{submission_id}/results`
- `GET /api/v1/problems/{slug}/submissions/best`
- `GET /api/v1/users/me/stats`
- `GET /api/v1/users/me/submissions`

Agent setup:

- Ensure `judge0-server`, `judge0-workers`, Redis, API, and `python -m app.workers.submission_worker` are running.
- Register admin and normal user.
- Create and publish the common `add-two` problem.
- Record `problem.id` and `problem.slug`.

Submission creation validation cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R5-01 | `POST /submissions` | no token | `401`; `code: UNAUTHORIZED` |
| R5-02 | invalid UUID | `problem_id: "not-a-uuid"` | `422`; `code: VALIDATION_ERROR` |
| R5-03 | random problem UUID | valid UUID not in DB | `404`; `detail: Problem not found` |
| R5-04 | unpublished problem UUID | created but not published | `404`; hidden like missing |
| R5-05 | invalid language | `ruby` | `422`; `code: VALIDATION_ERROR` |
| R5-06 | valid language unsupported by problem | e.g. `javascript` on python-only problem | `422`; `detail: Language not supported for this problem` |
| R5-07 | source too large | over 65536 chars or bytes | `422`; validation or `detail: Source code too large` |
| R5-08 | missing source_code | no source field | `422`; `code: VALIDATION_ERROR` |

Judging status cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R5-09 | accepted full submit | python `return a + b`, `run_samples_only: false` | initial `202 {id, status: PENDING}`; terminal `ACCEPTED`; score between `100` and `120`; all counts/weights pass |
| R5-10 | accepted sample-only | same code, `run_samples_only: true` | terminal `SAMPLE_PASSED`; score remains `0`; not counted in stats/best |
| R5-11 | wrong answer | python `return a - b` | terminal `WRONG_ANSWER`; score `0`; at least one failed result |
| R5-12 | compile error | invalid python syntax | terminal `COMPILE_ERROR`; `error_message` may be null; result stderr/compile output visible only for sample rows |
| R5-13 | runtime error | code raises exception | terminal `RUNTIME_ERROR`; score `0` |
| R5-14 | time limit | infinite loop | terminal `TIME_LIMIT` if Judge0 enforces timeout; if mapped differently, report actual Judge0 mapping |
| R5-15 | javascript accepted | JS `function addTwo(a,b){ return a + b; }` | terminal `ACCEPTED`; score between `100` and `120` |

Submission read/results cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R5-16 | `GET /submissions/{id}` | owner token | `200 SubmissionResponse` |
| R5-17 | `GET /submissions/{id}` | no token | `401`; `code: UNAUTHORIZED` |
| R5-18 | `GET /submissions/{id}` | other user's token | `404`; private resource hidden |
| R5-19 | `GET /submissions/{id}` | random UUID | `404`; `detail: Submission not found` |
| R5-20 | `GET /submissions/not-a-uuid` | owner token | `422`; `code: VALIDATION_ERROR` |
| R5-21 | `GET /submissions/{id}/results` | owner token after terminal status | `200`; one row per executed test case |
| R5-22 | results sample rows | sample case | includes `test_case_input`, `expected_output`, `stdout`, `stderr` |
| R5-23 | results hidden rows | hidden cases | `test_case_input`, `expected_output`, `stdout`, `stderr` are all `null` |
| R5-24 | results other user | other token | `404`; private resource hidden |

Best submission and stats cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R5-25 | best before full AC | user has only WA or sample-only | `404`; `detail: Best submission not found` |
| R5-26 | best after full AC | accepted full submission exists | `200`; id/status/score/passed_count/total_count/created_at |
| R5-27 | problem detail after AC | normal token | `user_status.solved: true`, `best_score` equals best qualifying score |
| R5-28 | stats after first full AC | user token | `total_solved: 1`, `easy_solved: 1`, `total_score` equals best score, streak at least `1` |
| R5-29 | duplicate full AC same problem | second accepted full submission | `total_solved` stays `1`; `total_score` recomputes to best score, not sum of duplicates |
| R5-30 | personal submissions after submissions | `GET /users/me/submissions` | newest-first list with submission response fields |

Example terminal accepted submission:

```json
{
  "id": "<uuid>",
  "user_id": "<uuid>",
  "problem_id": "<uuid>",
  "language": "python",
  "status": "ACCEPTED",
  "passed_count": 4,
  "total_count": 4,
  "passed_weight": 7,
  "total_weight": 7,
  "score": 100,
  "runtime_ms": 123,
  "memory_kb": 12345,
  "error_message": null,
  "run_samples_only": false,
  "created_at": "<iso-datetime>",
  "updated_at": "<iso-datetime>"
}
```

Round 5 report must include worker availability, terminal status timings, and whether any submissions were stuck in `PENDING` or `RUNNING`.

## Round 6 - Leaderboard, Rate Limits, And Scoring Aggregates

Purpose: verify leaderboard shape, all-time/weekly differences, Redis-backed cache behavior, submission rate limiting, and IP rate limiting.

Endpoints covered:

- `GET /api/v1/leaderboard/`
- `POST /api/v1/submissions`
- `GET /api/v1/users/me/stats`
- `GET /api/v1/problems`
- `GET /api/v1/health`

Agent setup:

- Run after or independently recreate the Round 5 fixture.
- Create at least two normal users.
- For each user, create at least one full accepted submission. Give user A a higher best score than user B when possible.
- Run IP rate limit checks last because they can temporarily affect the test client IP.

Leaderboard cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R6-01 | `GET /leaderboard/` | default | `200`; all-time array, rows have `username`, `total_score`, `total_solved`, `rank` |
| R6-02 | all-time explicit | `?period=all&limit=50` | same shape as default |
| R6-03 | weekly | `?period=week&limit=50` | rows have `username`, `weekly_score`, `weekly_solved`, `rank` |
| R6-04 | limit one | `?period=all&limit=1` | at most one row |
| R6-05 | invalid period | `?period=today` | `422`; `code: VALIDATION_ERROR` |
| R6-06 | invalid low/high limit | `?limit=0`, `?limit=101` | `422`; `code: VALIDATION_ERROR` |
| R6-07 | missing trailing slash | `GET /leaderboard` | FastAPI usually returns `307` redirect to `/leaderboard/`; report actual |
| R6-08 | inactive user excluded | DB set `is_active=false` for one ranked user | leaderboard should exclude inactive user |
| R6-09 | cache refresh after new AC | make a new accepted submission after first leaderboard call | within 60 sec, cache should be invalidated by scoring and new totals visible |

Submission rate limit cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R6-10 | first 10 submissions/min | same user, rapid valid submissions | each should be `202` unless other validation fails |
| R6-11 | 11th submission/min | same user | `429`; `detail: Rate limit exceeded`, `code: RATE_LIMIT` |
| R6-12 | second user submissions | different user immediately after first user's limit | should not inherit first user's submit limit |

IP rate limit cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R6-13 | under IP limit | up to 100 requests/min with same `X-Forwarded-For` | non-rate-limited status for target endpoint |
| R6-14 | over IP limit | 101st request/min with same `X-Forwarded-For` | `429`; `{"detail":"Too many requests","code":"RATE_LIMIT"}` |
| R6-15 | different forwarded IP | new `X-Forwarded-For` value | should not be blocked by previous IP bucket |

Example all-time leaderboard row:

```json
{
  "username": "round_123_user_a",
  "total_score": 118,
  "total_solved": 1,
  "rank": 1
}
```

Round 6 report must include whether Redis was reachable. If Redis is unavailable, health should degrade and rate-limit/leaderboard behavior must be reported separately.

## Round 7 - Security, Contract Drift, Boundaries, And Method Behavior

Purpose: verify edge cases that cut across endpoints, including documented-vs-live route drift, method restrictions, optional-auth behavior, CORS, oversized payloads, and data privacy.

Endpoints covered:

- All endpoints from earlier rounds as needed for setup.
- Negative checks for missing documented routes: `/api/v1/tags`, `/api/v1/admin/*`.
- Method checks for representative resources.

Agent setup:

- Create admin, normal user A, normal user B.
- Create and publish one problem.
- Create at least one full accepted submission for user A.

Route drift cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R7-01 | `GET /tags` | none | `404` because live route is `/problems/tags` |
| R7-02 | `POST /tags` | admin token | `404` because live route is `/problems/tags` |
| R7-03 | `POST /admin/problems` | admin token | `404` because admin create lives at `/problems` |
| R7-04 | `PATCH /admin/problems/{slug}` | admin token | `404` because admin update lives at `/problems/{slug}` |
| R7-05 | `DELETE /admin/problems/{id}` | admin token | `404`; no delete endpoint exists |
| R7-06 | `POST /admin/problems/{id}/test-cases` | admin token | `404`; no append-test-cases endpoint exists |

Method behavior cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R7-07 | `GET /auth/login` | none | `405` |
| R7-08 | `DELETE /users/me` | valid token | `405` |
| R7-09 | `PUT /problems/{slug}` | admin token | `405` |
| R7-10 | `DELETE /problems/{slug}` | admin token | `405` |
| R7-11 | `POST /leaderboard/` | none | `405` |
| R7-12 | `PATCH /submissions/{id}` | owner token | `405` |

Optional-auth and privacy cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R7-13 | `GET /problems` | no token | public `200` |
| R7-14 | `GET /problems` | invalid bearer token | `401`; optional auth still rejects bad token if provided |
| R7-15 | `GET /problems/{slug}` | no token | `200`, `user_status: null` |
| R7-16 | `GET /problems/{slug}` | user B token, unsolved | `200`, `user_status.solved: false` |
| R7-17 | `GET /submissions/{userA_id}` | user B token | `404`, not `403`, to avoid leaking ownership |
| R7-18 | `GET /submissions/{userA_id}/results` | user B token | `404`, not `403` |
| R7-19 | problem detail hidden cases | no token and user token | hidden test cases are absent; only sample I/O exposed |
| R7-20 | submission results hidden cases | owner token | hidden test rows have all I/O/stdout/stderr fields `null` |

Boundary cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R7-21 | register email length | 255 chars accepted if valid, 256 rejected | `200` then `422` |
| R7-22 | username boundary | 3 chars accepted, 50 accepted, 51 rejected | `200` or `422` as appropriate |
| R7-23 | problem slug boundary | 100 chars accepted, 101 rejected | `201` then `422` |
| R7-24 | title boundary | 200 chars accepted, 201 rejected | `201` then `422` |
| R7-25 | expected complexity boundary | 20 chars accepted, 21 rejected | `201/PATCH 200` then `422` |
| R7-26 | source code boundary | exactly 65536 chars accepted by schema, 65537 rejected | `202` or `422` as appropriate |
| R7-27 | multibyte source byte limit | chars under 65536 but bytes over `MAX_SOURCE_BYTES` | service should return `422 Source code too large` |
| R7-28 | malformed JSON body | representative POST/PATCH | `422`; `code: VALIDATION_ERROR` |

CORS/preflight cases:

| ID | Request | Input | Expected |
| --- | --- | --- | --- |
| R7-29 | `OPTIONS /auth/login` | `Origin: http://localhost:5173`, requested method POST | CORS middleware responds with allow-origin/method headers |
| R7-30 | disallowed origin | origin not in `CORS_ORIGINS` | no matching allow-origin header |

Round 7 report must list every route drift item as either "expected current implementation" or "contract issue" depending on the product decision. Do not silently treat missing `/api/v1/admin` or `/api/v1/tags` as a backend failure without noting that the live router intentionally mounts elsewhere today.

## Report Template

After every round, create `api_round_X_report.md` in the workspace root.

```markdown
# API Round X Report

Date/time:
Agent:
Backend commit/branch:
API base URL:
Database URL used:
Redis/Judge0 status:
Worker status:

## Summary

- Total cases:
- Passed:
- Failed:
- Blocked:
- Not run:

## Environment Verification

- API reachable:
- DB reachable:
- Redis reachable:
- Judge0 reachable:
- Worker processing submissions:
- Notes:

## Case Results

| Case ID | Endpoint | Expected | Actual | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| R1-01 | `GET /health` | `200` shape | `200` shape | PASS | ... |

## Response Samples

Include representative actual JSON for important success and failure cases. Redact JWTs after the first 20 characters.

## Issues Found

### Issue 1 - Short title

- Severity: Critical/High/Medium/Low
- Endpoint:
- Case IDs:
- Expected:
- Actual:
- Reproduction command or Python snippet:
- Suspected source file/function:
- Suggested fix:

## Regression Risks

- ...

## Suggested Follow-Up Tests

- ...
```

## Acceptance Criteria For The Whole Playbook

The API is considered covered when:

- Every route in the Route Map has at least one success case and multiple failure/boundary cases.
- Authenticated, unauthenticated, invalid-token, and wrong-role behaviors are checked.
- Published/unpublished problem visibility is checked.
- Hidden test cases are never leaked in problem detail or submission results.
- Submission lifecycle is checked from `PENDING` to terminal statuses with the worker running.
- User stats, best submission, acceptance rate, and leaderboard are checked after real accepted submissions.
- Rate limits are checked for both user submissions and IP requests.
- Missing documented routes are explicitly reported as route drift rather than ignored.
- Each executed round leaves behind a detailed `api_round_X_report.md`.
