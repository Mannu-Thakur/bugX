# Implementation Phase 1 — Project Setup

**Goal:** Runnable API, DB connected, health check, Docker compose, global rate-limit hook.

> **Doc numbering:** `01-database-models` is schema reference only. This file is **implementation phase 1** — see [README.md](./README.md#doc-numbering-vs-implementation-phases).

## Tasks

- [ ] Init FastAPI project under `backend/` — folder layout from [README.md](./README.md#repo-layout-backend)
- [ ] `backend/docker-compose.yml`: postgres, redis (`judge0-server`, `judge0-workers`, `api`, and XYZ `worker` added in Phase 4 — see [09-env-security.md](./09-env-security.md))
- [ ] Alembic init + first empty migration (sync URL — see below)
- [ ] Config via pydantic-settings (`app/core/config.py`)
- [ ] DB session dependency (`app/core/database.py`) — async engine from `DATABASE_URL`
- [ ] Global exception handlers
- [ ] CORS for frontend origin
- [ ] IP rate-limit middleware skeleton (`RateLimitService.check_ip`) — 100 req/min/IP per [09-env-security.md](./09-env-security.md)
- [ ] `GET /api/v1/health` → `{ status, db, redis }` (add `judge0` in Phase 4 — [07-api-routes.md](./07-api-routes.md#health))

## Files to create

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app, include routers |
| `app/core/config.py` | Settings from env |
| `app/core/database.py` | Engine, SessionLocal, get_db |
| `app/core/exceptions.py` | AppException → HTTP |
| `app/services/rate_limit_service.py` | Redis INCR for IP + submit (submit used in Phase 4) |
| `app/routers/health.py` | Health router |

## `config.py` fields

```python
DATABASE_URL,              # postgresql+asyncpg://… — runtime (API + worker)
ALEMBIC_DATABASE_URL,      # postgresql+psycopg2://… — Alembic only
REDIS_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES,
JUDGE0_URL, CORS_ORIGINS, ENV, API_V1_PREFIX="/api/v1",
MAX_SUBMISSIONS_PER_MINUTE=10, MAX_REQUESTS_PER_MINUTE_IP=100,
MAX_SOURCE_BYTES=65536,
RECLAIM_ALL_RUNNING_ON_START=false   # Phase 4 worker: dev-only stale RUNNING reclaim
```

## Alembic vs async runtime

| Concern | URL / driver |
|---------|----------------|
| FastAPI `get_db`, worker | `DATABASE_URL` with **asyncpg** + `create_async_engine` |
| `alembic upgrade head` | `ALEMBIC_DATABASE_URL` with **psycopg2** (sync) in `alembic/env.py` |

Add `psycopg2-binary` to `requirements.txt` for migrations only. Never point Alembic at the asyncpg URL.

Document both URLs in `.env.example` (see [09-env-security.md](./09-env-security.md)).

## `docker-compose.yml` evolution

| Phase | Add to compose |
|-------|----------------|
| **1** | `postgres`, `redis` (below) |
| **4** | `judge0-server`, `judge0-workers`, `api`, and XYZ `worker` — [09-env-security.md](./09-env-security.md) |
| **6** | Frontend is separate `frontend/` (not in backend compose) |

Keep one `docker-compose.yml` at **`backend/docker-compose.yml`** (same directory as `app/`, `alembic/`, `requirements.txt`). Run all compose commands from `backend/`. Extend the file per phase — do not split into multiple compose files.

Monorepo note: if the git root also contains `frontend/`, compose still lives under **`backend/`**, not the monorepo root.

## docker-compose (Phase 1 minimal)

Path: `backend/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: xyz_platform
      POSTGRES_PASSWORD: xyz_platform
      POSTGRES_DB: xyz_platform
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

## `main.py` (Phase 1)

Include `health` router only. Add auth/users/tags/problems/admin/submissions/leaderboard routers in later phases per [07-api-routes.md](./07-api-routes.md#router-mount-summary-appmainpy).

Implement `get_optional_user` in `deps.py` during Phase 2 (used by problem detail in Phase 3).

## Working directory

All backend commands assume `cd backend` (e.g. `uvicorn app.main:app --reload`, `alembic upgrade head`, `docker compose up`).

## Done when

- `uvicorn app.main:app --reload` works (from `backend/`)
- `/docs` shows Swagger
- `GET /api/v1/health` returns 200 with `db: ok`
- IP rate limit returns 429 when exceeded (pytest or manual)

## Tests

- `tests/test_health.py` — pytest hitting `GET /api/v1/health`
