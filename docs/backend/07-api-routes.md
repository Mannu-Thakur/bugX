# 07 — API Routes (v1)

Base: `/api/v1` · Auth header: `Authorization: Bearer <token>` (when required)

---

## Pagination

Applies to: `GET /problems`, `GET /users/me/submissions`, and any other paginated list.

| Param | Default | Max | Validation |
|-------|---------|-----|------------|
| `page` | `1` | — | integer ≥ 1; else **422** |
| `limit` | `20` | `100` | integer 1–100; else **422** |

**Response envelope:**

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "limit": 20,
  "pages": 5
}
```

`pages = 0` when `total == 0`, else `ceil(total / limit)` (integer division helper, e.g. `(total + limit - 1) // limit`). Implement once in `app/utils/pagination.py` and reuse for all list endpoints.

---

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/register` | `RegisterRequest` | `{ access_token, user }` |
| POST | `/auth/login` | `LoginRequest` | `{ access_token, user }` |

Refresh tokens: **v2** (not in v1).

### `RegisterRequest` validation

| Field | Rules |
|-------|--------|
| `email` | Valid email format (Pydantic `EmailStr`); max 255; unique → **422** `EMAIL_TAKEN` |
| `username` | 3–50 chars; `^[a-zA-Z0-9_-]+$`; unique → **422** `USERNAME_TAKEN` |
| `password` | Min 8 chars; at least 1 letter and 1 digit |

### `LoginRequest`

| Field | Rules |
|-------|--------|
| `email` | Required; valid format |
| `password` | Required |

Wrong credentials → **401** (same message for unknown email vs wrong password).

### `UserProfile` (register, login, `GET/PATCH /users/me`)

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "coder",
  "role": "USER",
  "avatar_url": null,
  "is_active": true,
  "created_at": "2026-05-25T12:00:00Z"
}
```

---

## Users

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/users/me` | ✓ active | UserProfile |
| PATCH | `/users/me` | ✓ active | Body: `{ username?, avatar_url? }` → UserProfile |
| GET | `/users/me/stats` | ✓ active | UserStats (Phase 5) |
| GET | `/users/me/submissions` | ✓ active | Paginated SubmissionSummary (Phase 5) |

### `UserStats`

```json
{
  "total_solved": 3,
  "easy_solved": 2,
  "medium_solved": 1,
  "hard_solved": 0,
  "total_score": 340,
  "current_streak": 2,
  "best_streak": 5,
  "last_active_date": "2026-05-25"
}
```

### `SubmissionSummary` (list item)

```json
{
  "id": "uuid",
  "problem_id": "uuid",
  "problem_slug": "two-sum",
  "problem_title": "Two Sum",
  "language": "python",
  "status": "ACCEPTED",
  "score": 115,
  "runtime_ms": 42,
  "run_samples_only": false,
  "created_at": "2026-05-25T12:00:00Z"
}
```

---

## Tags

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/tags` | - | `{ "items": ["array", "hash-map", ...] }` — all tag names, sorted **ASC** |

Used by problem-list tag filter UI and admin forms. Names are unique (see `tags.name`).

---

## Problems

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/problems` | - | Paginated; filters below |
| GET | `/problems/{slug}` | optional | `get_optional_user` — see [Optional auth](#optional-auth-on-problem-detail) |
| GET | `/problems/{slug}/submissions/best` | ✓ active | Phase 5 — best qualifying submission |

### `GET /problems` query params

| Param | Type | Notes |
|-------|------|-------|
| `page`, `limit` | int | [Pagination](#pagination) |
| `difficulty` | string | `EASY` \| `MEDIUM` \| `HARD` — exact enum match; invalid → **422** |
| `tag` | string | Exact `tags.name`, **case-sensitive**; problems must have that tag; unknown tag → **empty list** (not 404) |
| `search` | string | Case-insensitive substring on `problems.title` |
| `sort` | string | `title` (default) \| `acceptance` |

**Sort `acceptance`:** `ORDER BY acceptance_rate DESC NULLS LAST, title ASC`.

Only `is_published = true` in public list.

### Optional auth on problem detail

- No `Authorization` header → `user_status: { "solved": false, "best_score": null }` (same shape as stub).
- Valid Bearer + active user → Phase 3 stub or Phase 4+ live `user_status` per [README.md](./README.md).
- Invalid/expired token → **401** (do not silently treat as anonymous).

### `ProblemDetail` response

```json
{
  "id": "uuid",
  "slug": "two-sum",
  "title": "Two Sum",
  "description": "markdown...",
  "difficulty": "EASY",
  "time_limit_ms": 2000,
  "memory_limit_kb": 262144,
  "score_base": 100,
  "runtime_bonus_max": 20,
  "acceptance_rate": 42.5,
  "tags": ["array", "hash-map"],
  "templates": {
    "python": "def twoSum(...):\n    pass",
    "javascript": "function twoSum(...) {\n}"
  },
  "sample_tests": [
    { "input": "[[2,7,11,15],9]", "expected_output": "[0,1]" }
  ],
  "user_status": { "solved": false, "best_score": null }
}
```

Hidden test `input` / `expected_output` are **never** included.

### Best qualifying submission

`GET /problems/{slug}/submissions/best` — authenticated owner only.

- Row: `status = ACCEPTED`, `run_samples_only = false`, highest `score` (tie-break: lowest `runtime_ms`, then earliest `created_at`)
- **404** if no qualifying row
- Implement in **Phase 5** (`ProblemController.get_best_submission` → `SubmissionRepo.get_best_qualifying`)

**Response `BestSubmission`:**

```json
{
  "id": "uuid",
  "problem_id": "uuid",
  "language": "python",
  "source_code": "...",
  "status": "ACCEPTED",
  "score": 115,
  "runtime_ms": 42,
  "memory_kb": 10240,
  "passed_count": 7,
  "total_count": 7,
  "passed_weight": 7,
  "total_weight": 7,
  "run_samples_only": false,
  "created_at": "2026-05-25T12:00:00Z"
}
```

---

## Submissions

| Method | Path | Auth | Body / Response |
|--------|------|------|-----------------|
| POST | `/submissions` | ✓ active | `SubmissionCreate` → `202 { id, status: PENDING }` |
| GET | `/submissions/{id}` | ✓ owner | SubmissionDetail — **404** if not owner |
| GET | `/submissions/{id}/results` | ✓ owner | Per-test results; hidden tests omit input/expected |

### `SubmissionCreate`

```json
{
  "problem_id": "uuid",
  "language": "python",
  "source_code": "...",
  "run_samples_only": false
}
```

| Field | Default | Meaning |
|-------|---------|---------|
| `run_samples_only` | `false` | `true` = Run (samples only); `false` = Submit (all tests) |

Both count toward 10 submits/min/user.

**Validation:** published problem; `language` ∈ `{python, javascript}`; template exists; `source_code` ≤ 64 KB (`MAX_SOURCE_BYTES`). See [05-phase-4-judge.md](./05-phase-4-judge.md).

**Terminal statuses:** `PENDING`, `RUNNING`, `ACCEPTED`, `SAMPLE_PASSED`, `WRONG_ANSWER`, `TIME_LIMIT`, `RUNTIME_ERROR`, `COMPILE_ERROR`, `MEMORY_LIMIT`.

### `SubmissionDetail`

```json
{
  "id": "uuid",
  "problem_id": "uuid",
  "language": "python",
  "status": "ACCEPTED",
  "score": 115,
  "passed_count": 7,
  "total_count": 7,
  "passed_weight": 7,
  "total_weight": 7,
  "runtime_ms": 42,
  "memory_kb": 10240,
  "error_message": null,
  "run_samples_only": false,
  "created_at": "2026-05-25T12:00:00Z"
}
```

**Polling:** until status ∉ `{PENDING, RUNNING}`; if `ACCEPTED`, also poll until `score > 0` or ~60s timeout.

---

## Leaderboard

| GET | `/leaderboard` | Query: `period=all|week` (default `all`), `limit` (default 50, max 100) |

```json
{
  "period": "all",
  "entries": [
    { "rank": 1, "username": "...", "score": 420, "solved": 12 }
  ]
}
```

---

## Admin (role=ADMIN)

Mounted at `/api/v1/admin` — all routes require `require_admin`.

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/problems` | `ProblemCreate` |
| PUT | `/admin/problems/{id}` | `ProblemUpdate` |
| DELETE | `/admin/problems/{id}` | — (unpublish only) |
| POST | `/admin/problems/{id}/test-cases` | `TestCaseCreate[]` |
| POST | `/admin/tags` | `TagCreate` |

### `ProblemCreate`

```json
{
  "slug": "two-sum",
  "title": "Two Sum",
  "description": "markdown body",
  "difficulty": "EASY",
  "time_limit_ms": 2000,
  "memory_limit_kb": 262144,
  "score_base": 100,
  "runtime_bonus_max": 20,
  "expected_complexity": "O(n)",
  "is_published": true,
  "tag_names": ["array", "hash-map"],
  "templates": [
    {
      "language": "python",
      "template_code": "def twoSum(nums, target):\n    pass",
      "function_name": "twoSum",
      "arg_style": "positional"
    },
    {
      "language": "javascript",
      "template_code": "function twoSum(nums, target) {}",
      "function_name": "twoSum",
      "arg_style": "positional"
    }
  ],
  "test_cases": [
    {
      "input": "[[2,7,11,15],9]",
      "expected_output": "[0,1]",
      "is_sample": true,
      "order_index": 0,
      "weight": 1
    }
  ]
}
```

| Field | Rules |
|-------|--------|
| `slug` | Unique; `^[a-z0-9]+(?:-[a-z0-9]+)*$`; max 100 |
| `title` | 1-200 chars |
| `time_limit_ms` | integer 100-15000; used for Judge0 timeout and scoring bonus |
| `memory_limit_kb` | integer 16000-256000; must not exceed Judge0 configured max memory |
| `score_base` | integer 1-10000 |
| `runtime_bonus_max` | integer 0-10000 |
| `templates` | ≥1; each `language` ∈ `{python, javascript}`; `function_name` must match `^[A-Za-z_][A-Za-z0-9_]*$`; `template_code` 1-65536 bytes; `arg_style` ∈ `{kwargs, positional, single}` — **`kwargs` only when `language` is `python`**; `javascript` must use `positional` or `single` → else **422** `VALIDATION_ERROR` (no JS kwargs wrapper in v1) |
| `test_cases` | ≥1 sample (`is_sample=true`) + ≥3 hidden (`is_sample=false`); `input` and `expected_output` must parse as JSON; `order_index` unique per problem; `weight` integer ≥1 |
| `tag_names` | Creates/links tags via `TagService.get_or_create` |

### `ProblemUpdate` (all fields optional)

```json
{
  "title": "...",
  "description": "...",
  "difficulty": "MEDIUM",
  "time_limit_ms": 3000,
  "memory_limit_kb": 262144,
  "score_base": 100,
  "runtime_bonus_max": 20,
  "expected_complexity": "O(n log n)",
  "is_published": false,
  "tag_names": ["array"]
}
```

Does not replace templates or test cases in v1 — use dedicated routes / new problem for bulk test edits.

Numeric fields on update use the same ranges as `ProblemCreate`. If `tag_names` is present, replace links with the supplied set. Empty `tag_names` is allowed and means no tags.

### `TestCaseCreate`

```json
{
  "input": "[[1,2],3]",
  "expected_output": "[0,1]",
  "is_sample": false,
  "order_index": 7,
  "weight": 1
}
```

| Field | Rules |
|-------|--------|
| `input` | Must parse as one JSON value; raw value is passed to Judge0 stdin |
| `expected_output` | Must parse as one JSON value; compared by `OutputCompareService` |
| `order_index` | Unique per problem across existing and new rows |
| `weight` | integer ≥1 |

### `TagCreate`

```json
{ "name": "dynamic-programming" }
```

| Field | Rules |
|-------|--------|
| `name` | 1–50 chars; `^[a-z0-9]+(?:-[a-z0-9]+)*$`; unique → **422** if exists |

---

## Health

| GET | `/health` | See response below |

Mounted at `/api/v1/health`.

**Phase 1–3 response:**

```json
{ "status": "ok", "db": "ok", "redis": "ok" }
```

**Phase 4+ response** (add Judge0 probe when `JUDGE0_URL` is set):

```json
{ "status": "ok", "db": "ok", "redis": "ok", "judge0": "ok" }
```

| Field | Phase | Values |
|-------|-------|--------|
| `status` | 1+ | `"ok"` if all checked deps are ok; `"degraded"` if any dependency is `error` |
| `db` | 1+ | `"ok"` \| `"error"` — Postgres `SELECT 1` |
| `redis` | 1+ | `"ok"` \| `"error"` — Redis `PING` |
| `judge0` | 4+ | `"ok"` \| `"error"` — HTTP GET `{JUDGE0_URL}/about` plus `{JUDGE0_URL}/workers`; `ok` only when server responds and workers report `available >= 1`; omit or `"skipped"` in Phases 1–3 |

Return **200** with `status: "degraded"` when a non-critical check fails (do not return 503 for dev ergonomics).

---

## Standard errors

```json
{ "detail": "message", "code": "VALIDATION_ERROR|NOT_FOUND|RATE_LIMIT|EMAIL_TAKEN|USERNAME_TAKEN|FORBIDDEN" }
```

| Code | HTTP |
|------|------|
| NOT_FOUND | 404 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| RATE_LIMIT | 429 |
| VALIDATION_ERROR | 422 |
| EMAIL_TAKEN | 422 |
| USERNAME_TAKEN | 422 |

---

## Router mount summary (`app/main.py`)

```python
API = "/api/v1"
app.include_router(health_router, prefix=API, tags=["health"])
app.include_router(auth_router, prefix=f"{API}/auth", tags=["auth"])
app.include_router(users_router, prefix=f"{API}/users", tags=["users"])
app.include_router(tags_router, prefix=API, tags=["tags"])           # Phase 3
app.include_router(problems_router, prefix=API, tags=["problems"])   # Phase 3
app.include_router(admin_router, prefix=f"{API}/admin", tags=["admin"])  # Phase 3
app.include_router(submissions_router, prefix=f"{API}/submissions", tags=["submissions"])  # Phase 4
app.include_router(leaderboard_router, prefix=API, tags=["leaderboard"])  # Phase 5
```
