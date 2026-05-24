# XYZ Platform — Backend Plan Index

LeetCode-inspired coding judge (**xyz_plateform**). **Stack:** FastAPI · PostgreSQL · Redis · Judge0 (Docker) · JWT

**Also see:** [../README.md](../README.md) (docs index) · [../requirements.md](../requirements.md) · [../diagrams/uml-specification.md](../diagrams/uml-specification.md) · [../comparison/mern-vs-fastapi.md](../comparison/mern-vs-fastapi.md) · [../analysis/plan-readiness-review.md](../analysis/plan-readiness-review.md)

## Reference docs (not build sprints)

| Doc | Purpose |
|-----|---------|
| [00-overview.md](./00-overview.md) | Stack, conventions, enums |
| [01-database-models.md](./01-database-models.md) | Schema reference — implement via migrations in Phases 2–4 |
| [07-api-routes.md](./07-api-routes.md) | REST contract (pagination, schemas, validation) |
| [08-controllers-services.md](./08-controllers-services.md) | Layer map |
| [09-env-security.md](./09-env-security.md) | Env, deploy, limits |
| [10-frontend-ui-map.md](./10-frontend-ui-map.md) | UI → API map |
| [11-phase-6-frontend.md](./11-phase-6-frontend.md) | Frontend implementation checklist |
| [12-seed-problems-spec.md](./12-seed-problems-spec.md) | Canonical seed payloads (5 problems, all test I/O) |
| [13-plan-verification.md](./13-plan-verification.md) | Plan completeness checklist (re-verify after edits) |

## Doc numbering vs implementation phases

| Prefix | Meaning |
|--------|---------|
| `00-`, `01-`, `07-`–`13-` | Reference / contract docs (not a build sprint) |
| `02-phase-*` … `06-phase-*`, `11-phase-*` | **Implementation phases** — build in README order |

When naming Alembic revisions, use implementation phase numbers (e.g. `phase2_auth`), not `01-database-models`.

## Implementation phases (build in this order)

| Impl. phase | File | Deliverable |
|-------------|------|-------------|
| **1** | [02-phase-1-setup.md](./02-phase-1-setup.md) | Bootstrap, config, DB, health, IP rate-limit middleware |
| **2** | [03-phase-2-auth.md](./03-phase-2-auth.md) | Register, login, JWT, profile (no refresh tokens in v1) |
| **3** | [04-phase-3-problems.md](./04-phase-3-problems.md) | Problems catalog, tags, templates, seed (5 problems) |
| **4** | [05-phase-4-judge.md](./05-phase-4-judge.md) | Submit, queue, Judge0, results (no stats/leaderboard yet) |
| **5** | [06-phase-5-scoring.md](./06-phase-5-scoring.md) | Scoring, user_stats, leaderboard, acceptance rate |
| **6** | [11-phase-6-frontend.md](./11-phase-6-frontend.md) | Frontend (see also [10-frontend-ui-map.md](./10-frontend-ui-map.md)) |

## Build order

```
Impl 1 → 2 → 3 → 4 → 5 → (6 frontend)
Working directory for backend: cd backend
After Impl 3: python scripts/seed_problems.py (admin + 5 problems per [12-seed-problems-spec.md](./12-seed-problems-spec.md); requires SEED_ADMIN_* env)
```

**Worker pipeline (Phases 4 + 5):**

```
Impl 4: judge_service.run() → status, counts, runtime, submission_results
Impl 5: add scoring_service.on_submission_complete() as final worker step
```

Do not call `ScoringService` from the worker until Implementation Phase 5 is merged.

## Resolved decisions (v1)

Single source of truth — do not duplicate elsewhere.

| Topic | Decision |
|-------|----------|
| Refresh tokens | **Out of v1** — access JWT only; v2 may add `refresh_tokens` |
| Supported languages | **python**, **javascript** only (Judge0 IDs 71, 63); C++ deferred to v2 |
| Run vs submit | `POST /submissions` body flag `run_samples_only` (default `false`); both count toward submit rate limit |
| Sample run status | `run_samples_only=true` → terminal **`SAMPLE_PASSED`** if all sample tests pass; never **`ACCEPTED`** |
| Qualifying submission | `status = ACCEPTED` **and** `run_samples_only = false` — used for solved, bests, stats, leaderboards, first AC |
| Judge test loop | Run **all** tests in scope sequentially; no early exit; terminal status = worst outcome after loop |
| `user_status` Phase 3 | Stub `{ solved: false, best_score: null }` — do **not** query `submissions` |
| `user_status` Phase 4+ | Live qualifying queries per [01-database-models.md](./01-database-models.md) |
| `user_status.solved` | `EXISTS` qualifying submission — may be **true** while `best_score` is still **null** (scoring pending) |
| `user_status.best_score` | `null` if no qualifying row; else `MAX(score)` — return **`null` when max is `0`**. After Phase 5 scoring, qualifying AC scores are `≥ score_base` (default 100) |
| Tag filter | `GET /problems?tag=<name>` — exact match on `tags.name`, **case-sensitive**; omit param = no tag filter |
| Tag discovery | `GET /tags` — public list of all tag names (for filters / admin UI) |
| Pagination | Default `page=1`, `limit=20`; max `limit=100`; `pages=0` when `total=0`, else `ceil(total/limit)` — see [07-api-routes.md](./07-api-routes.md#pagination) |
| Docker Compose | Single file at **`backend/docker-compose.yml`**; run `docker compose` from **`backend/`** |
| `submission_results` | `UNIQUE(submission_id, test_case_id)`; `judge_service.run` deletes all rows for submission before test loop |
| Template `arg_style` | **`kwargs` for `python` only**; `javascript` must be `positional` or `single` → **422** on admin create |
| Optional auth | `GET /problems/{slug}` uses `get_optional_user` — anonymous gets stub `user_status`; Bearer adds live/stub per phase |
| First ADMIN | `scripts/seed_problems.py` from `SEED_ADMIN_*` env; seed uses **repos/services directly** (no HTTP/JWT) |
| Submission queue | Redis LIST `submission_queue`; payload `{"submission_id":"<uuid>"}` JSON string (Phase 4) |
| Worker concurrency | **One** worker replica in v1; dequeue only processes rows with `status = PENDING` |
| Worker idempotency | `process_submission` no-ops unless `status == PENDING`; reclaim sets stale `RUNNING` → `PENDING` + reset judge counters; `judge_service.run` deletes prior `submission_results` |
| Stale `RUNNING` reclaim | Prod: `updated_at` older than 10 minutes; dev optional `RECLAIM_ALL_RUNNING_ON_START=true` |
| Judge0 compose | Use `judge0-server` + `judge0-workers`; verify `/workers` reports `available >= 1` before testing submissions |
| `submissions.updated_at` | Set on every status transition (`PENDING`→`RUNNING`→terminal) — required for reclaim |
| Inactive users | Login → **403**; protected routes use `get_current_active_user` |
| Submission reads | Owner-only; **404** if not owner (no admin override in v1) |
| Scoring worker error | Log; leave `ACCEPTED` + `score=0`; frontend poll timeout ~60s; recover via `scripts/rescore_submission.py` |
| Partial credit | **Out of v1** — `score = 0` unless qualifying submission (all weighted tests passed) |
| `user_stats.total_score` | **Recompute** sum of per-problem qualifying `MAX(score)` on each scoring run — never blind increment |
| `user_stats` solve counts | **Increment** `total_solved` + difficulty column only on first qualifying AC per problem |
| Weekly leaderboard | Sum of per-problem best `score` from qualifying submissions with `created_at` in last 7 days (UTC); rows with `score=0` contribute 0 until scored |
| All-time leaderboard | `user_stats.total_score` (recomputed from qualifying bests on each scoring run) |
| `acceptance_rate` | `100 * qualifying_AC_count / qualifying_submission_count` per problem (`run_samples_only=false` only) |
| Stats concurrency | `SELECT … FOR UPDATE` on `user_stats` inside Postgres transaction; recompute `total_score` idempotently |
| Leaderboard cache | `DEL leaderboard:all leaderboard:week` **after** DB commit (Redis not in SQL txn) |
| Admin delete | **Unpublish** only (`is_published = false`); no row delete in v1 |
| Health path | `/api/v1/health` — Phases 1–3: `db`, `redis`; Phase 4+: add `judge0` probe — [07-api-routes.md](./07-api-routes.md#health) |
| Alembic vs runtime DB | Runtime `DATABASE_URL` uses **asyncpg**; migrations use **`ALEMBIC_DATABASE_URL`** with **psycopg2** (sync) |
| `submission_status` enum | Created in Phase 4 migration with **`SAMPLE_PASSED`** included — see [01-database-models.md](./01-database-models.md#alembic) |
| Worker (dev) | `python -m app.workers.submission_worker` or `docker compose up worker` (Phase 4+) |
| Frontend stack (Phase 6) | React 18 + Vite + **react-router-dom v6** + **Tailwind CSS** + TanStack Query + Monaco — locked in [11-phase-6-frontend.md](./11-phase-6-frontend.md) |

## Repo layout (backend)

This repository root is **xyz_plateform**. Application code will live under:

```
backend/
├── app/
│   ├── main.py
│   ├── core/          # config, security, deps
│   ├── models/        # SQLAlchemy
│   ├── schemas/       # Pydantic
│   ├── routers/       # thin HTTP
│   ├── controllers/   # orchestration
│   ├── services/      # business logic
│   ├── repositories/  # DB queries
│   └── workers/       # submission queue consumer
├── alembic/
├── scripts/           # seed_problems.py, rescore_submission.py (Phase 5)
├── tests/
├── docker-compose.yml
└── requirements.txt
```

Phase 4+ compose uses `backend/Dockerfile` for the `api` and XYZ `worker` images.

## Plan status

Last verified against [13-plan-verification.md](./13-plan-verification.md) — **50/50** checklist items pass (includes UML diagrams).
