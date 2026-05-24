# Backend Contract Analysis

Analyzed on the `frontend` branch against the current backend code and existing backend docs.

## Sources Reviewed

- `docs/requirements.md`
- `docs/backend/00-overview.md`
- `docs/backend/01-database-models.md`
- `docs/backend/04-phase-3-problems.md`
- `docs/backend/05-phase-4-judge.md`
- `docs/backend/06-phase-5-scoring.md`
- `docs/backend/07-api-routes.md`
- `docs/backend/08-controllers-services.md`
- `docs/backend/10-frontend-ui-map.md`
- `docs/backend/11-phase-6-frontend.md`
- `docs/backend/12-seed-problems-spec.md`
- `docs/diagrams/uml-specification.md`
- `backend/app/main.py`
- backend routers, controllers, schemas, models, repositories, services, middleware, worker, and tests

## Product Model

XYZ Platform is a coding judge with:

- anonymous access to public problem browsing and leaderboard,
- user auth, profile, stats, submissions, run, and submit,
- admin problem creation, update, unpublish, tags, templates, and tests,
- Redis-backed rate limiting and submission queue,
- Judge0-backed code execution,
- scoring and stats after accepted full submissions.

The frontend should model the product as these feature areas:

- auth and session,
- problem catalog,
- solve workspace,
- submissions and results,
- profile stats and activity,
- leaderboard,
- admin problem management,
- shared app shell and component system.

## Current Mounted API Surface

These routes are mounted in the current `backend/app/main.py`.

| Area | Method | Path | Notes |
| --- | --- | --- | --- |
| Health | GET | `/api/v1/health` | Returns dependency statuses: `status`, `db`, `redis`, `judge0`. |
| Auth | POST | `/api/v1/auth/register` | Returns `Token`: `access_token`, `token_type`, `user`. |
| Auth | POST | `/api/v1/auth/login` | Returns `Token`: `access_token`, `token_type`, `user`. |
| Users | GET | `/api/v1/users/me` | Requires active Bearer token. |
| Users | PATCH | `/api/v1/users/me` | Updates `username` and/or `avatar_url`. |
| Users | GET | `/api/v1/users/me/stats` | Requires active Bearer token. Returns stats dict. |
| Users | GET | `/api/v1/users/me/submissions` | Requires active Bearer token. Supports `page`, `limit`. |
| Problems | GET | `/api/v1/problems` | Public list with `page`, `limit`, `difficulty`, `tag`, `search`, `sort`. |
| Problems | GET | `/api/v1/problems/tags` | Current tag list route. Returns `TagResponse[]`, not documented `{ items: string[] }`. |
| Problems | POST | `/api/v1/problems/tags?name=...` | Admin-only tag create. |
| Problems | GET | `/api/v1/problems/{slug}` | Optional auth. Admin can view unpublished problems. |
| Problems | GET | `/api/v1/problems/{slug}/submissions/best` | Authenticated best qualifying submission. |
| Problems | POST | `/api/v1/problems` | Admin-only create problem. |
| Problems | PATCH | `/api/v1/problems/{slug}` | Admin-only update, including `is_published`. |
| Submissions | POST | `/api/v1/submissions` | Requires active Bearer token. Returns `202 { id, status }`. |
| Submissions | GET | `/api/v1/submissions/{id}` | Owner-only, returns 404 if not owner. |
| Submissions | GET | `/api/v1/submissions/{id}/results` | Owner-only results. Hidden tests omit I/O. |
| Leaderboard | GET | `/api/v1/leaderboard/` | Query: `period=all|week`, `limit=1..100`. Current route has canonical trailing slash. |

## Documented Contract Differences

These are required by the documented v1 frontend, but current routes or shapes differ.

| Area | Documented Path | Current Status |
| --- | --- | --- |
| Tags | `GET /api/v1/tags` returning `{ items: string[] }` | Current route is `GET /api/v1/problems/tags` returning `TagResponse[]`. |
| Admin create/update/unpublish | `/api/v1/admin/*` | Current create/update/tag routes live under `/api/v1/problems`; no `/admin` prefix. |
| Admin unpublish | `DELETE /api/v1/admin/problems/{id}` | Current equivalent is `PATCH /api/v1/problems/{slug}` with `is_published: false`. |
| Admin add test cases | `POST /api/v1/admin/problems/{id}/test-cases` | No current route found. |
| Admin create problem tags | `tag_names` in request body | Current schema uses `tag_ids`; tags must already exist or be created separately. |

Frontend implication:

- add adapters that can normalize shape differences,
- prefer current live routes during implementation while keeping the documented target isolated in endpoint definitions,
- use fixtures or mocks only for route/actions still missing,
- track these as live-backend dependencies in each phase.

## Data Model Summary

| Model | Frontend Usage |
| --- | --- |
| `User` | Session user, nav identity, admin route gating, profile update. |
| `UserStats` | Profile stat cards, score, solved counts, streaks, future heatmap context. |
| `Problem` | Catalog row, problem detail, difficulty, scoring limits, acceptance rate. |
| `ProblemTemplate` | Language starter code in Monaco. |
| `TestCase` | Sample tests displayed in solve workspace. Hidden tests stay hidden. |
| `Tag` | Catalog filters and admin tagging. |
| `Submission` | Run/submit polling, status badges, history rows, score display. |
| `SubmissionResult` | Test result panel. Only sample results expose input/output/stdout/stderr. |

## Auth Contract

`POST /auth/register` and `POST /auth/login` return:

```json
{
  "access_token": "jwt",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "coder",
    "role": "USER",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-05-25T00:00:00"
  }
}
```

Frontend rules:

- persist token in localStorage,
- inject `Authorization: Bearer <token>` for protected calls,
- hydrate session with `GET /users/me` on app load,
- clear token and query cache on 401 or logout,
- block admin routes unless `user.role === "ADMIN"`.

## Error Handling

Standard documented shape:

```json
{ "detail": "message", "code": "VALIDATION_ERROR" }
```

Current backend behavior details:

- validation errors use `422` and `code: "VALIDATION_ERROR"`,
- auth failures use `401`,
- inactive/protected failures use `403`,
- owner-only submission reads return `404`,
- IP middleware returns `429` with `code: "RATE_LIMIT"`,
- submission controller rate limit raises `429`, but the global HTTP handler may map the code inconsistently.

Frontend rule:

- branch on HTTP status first, then body code,
- always treat `429` as rate limit,
- show validation messages cleanly even when `detail` is a string or an array.

## Submission And Judge Flow

`POST /submissions` body:

```json
{
  "problem_id": "uuid",
  "language": "python",
  "source_code": "...",
  "run_samples_only": false
}
```

Supported languages:

- `python`
- `javascript`

Statuses:

- in progress: `PENDING`, `RUNNING`
- success: `SAMPLE_PASSED`, `ACCEPTED`
- failure: `WRONG_ANSWER`, `TIME_LIMIT`, `RUNTIME_ERROR`, `COMPILE_ERROR`, `MEMORY_LIMIT`

Frontend polling:

- Run: `run_samples_only: true`, poll submission until terminal. `SAMPLE_PASSED` is green but not solved.
- Submit: `run_samples_only: false`, poll submission until terminal. If terminal is `ACCEPTED`, keep polling until `score > 0` or timeout.
- Fetch `/submissions/{id}/results` after terminal status to populate sample result panels.

## Scoring, Stats, And Analytics

Scoring rules:

- score is 0 unless `status === "ACCEPTED"` and `run_samples_only === false`,
- accepted full submit receives `score_base + runtime_bonus`,
- sample run never updates score, stats, solved state, or acceptance rate,
- scoring may lag behind accepted status; frontend must show solved and pending score separately.

Stats endpoint currently returns:

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

Leaderboard current response differs from the docs:

- documented target: `{ period, entries: [{ rank, username, score, solved }] }`
- current all-time: list of `{ username, total_score, total_solved, rank }`
- current weekly: list of `{ username, weekly_score, weekly_solved, rank }`

Frontend client should normalize all leaderboard responses into:

```ts
type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  solved: number;
};
```

## API Shape Mismatches To Normalize

| Area | Documented Target | Current Code / Schema | Frontend Plan |
| --- | --- | --- | --- |
| Tags endpoint | `/tags` with `{ items }` | `/problems/tags` with `TagResponse[]` | Support both and normalize to `string[]`. |
| Problem detail templates | `templates: { python, javascript }` | schema has `templates: TemplateResponse[]` | Normalize to `Record<Language, string>`. |
| Problem sample tests | `sample_tests` | schema has `sample_test_cases` | Accept both names. |
| Problem tags | string names in docs | schema uses `TagResponse[]` | Normalize to `string[]` plus optional tag ids. |
| Admin create tags | `tag_names` | current schema uses `tag_ids` | Admin phase must support documented target and current schema separately. |
| Admin publish flag | `is_published` in create body | current create always sets unpublished; update supports `is_published` | Use create then patch publish when needed. |
| User submissions | includes problem slug/title in docs | current controller returns raw `Submission` rows | Render available fields; enrich when API supports problem metadata. |
| Leaderboard | object with `entries` | current service returns list | Normalize in client. |
| Rate limit error code | `RATE_LIMIT` | may be inconsistent for controller-thrown 429 | Key UI behavior on status 429. |

## Frontend Dependency Summary

| Frontend Phase | Live Backend Required | Can Build With Fixtures |
| --- | --- | --- |
| Bootstrap/app shell | Health optional | Yes |
| Auth | Auth and `/users/me` | Mostly no, should use live backend early |
| Problem catalog | current `/problems`, `/problems/tags`; target `/tags` | Yes for edge states |
| Solve detail | `/problems/{slug}`, `/submissions`, `/results` | Yes for editor layout; run/submit needs live backend data |
| Profile/stats | `/users/me/stats`, `/users/me/submissions` | Yes for visual work, live for final |
| Leaderboard | `/leaderboard/` | Yes |
| Admin | current admin actions under `/problems`; target `/admin/*` | Yes for missing actions |

## Open Backend Dependencies For Full Live Frontend

Before the frontend can be fully verified against the documented canonical contract, these should be completed or confirmed:

- decide whether to keep current consolidated `/api/v1/problems/*` routes or move tags/admin to the documented `/api/v1/tags` and `/api/v1/admin/*`,
- add missing admin delete/unpublish-by-id and append-test-cases routes if the frontend should match the docs exactly,
- confirm seed script exists and seeds the 5 canonical problems,
- decide final problem response shape: templates object vs array, sample field naming,
- decide final admin create shape: `tag_names` vs `tag_ids`, and publish behavior,
- decide final leaderboard response envelope,
- optionally add an activity aggregate endpoint if the profile heatmap should show full calendar history instead of deriving from visible submissions.
