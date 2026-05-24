# 09 — Env, Security, Deploy

## `.env.example`

```env
ENV=development
SECRET_KEY=change-me-32-chars-min
DATABASE_URL=postgresql+asyncpg://xyz_platform:xyz_platform@localhost:5432/xyz_platform
ALEMBIC_DATABASE_URL=postgresql+psycopg2://xyz_platform:xyz_platform@localhost:5432/xyz_platform
REDIS_URL=redis://localhost:6379/0
JUDGE0_URL=http://localhost:2358
CORS_ORIGINS=http://localhost:5173
ACCESS_TOKEN_EXPIRE_MINUTES=60
MAX_SUBMISSIONS_PER_MINUTE=10
MAX_REQUESTS_PER_MINUTE_IP=100
MAX_SOURCE_BYTES=65536
RECLAIM_ALL_RUNNING_ON_START=false
SEED_ADMIN_EMAIL=admin@xyz-platform.local
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=Admin12345
```

## Security checklist

| Item | Rule |
|------|------|
| Passwords | bcrypt cost 12 |
| JWT secret | env only, never commit |
| SQL | ORM only, no raw string concat |
| User code | Judge0 sandbox only, never eval on API server |
| Hidden tests | Never in GET problem or non-sample result rows |
| Submission code | **Owner only** in v1 (`GET /submissions/{id}`); no admin read-other-user route |
| Rate limit submit | Redis: 10/min/user — Phase 4 `SubmissionService` (Run + Submit both) |
| Rate limit IP | Redis: 100/min/IP — Phase 1 middleware |
| CORS | Whitelist frontend origin |
| Admin routes | `require_admin` on all `/admin/*` |
| Seed admin | `SEED_ADMIN_*` env only in dev; rotate password in prod; never commit real prod secrets |

## Judge0 isolation

- API server never executes user code
- Worker talks to Judge0 over internal Docker network
- Use official Judge0 CE image; disable outbound network in judge config when possible

## Judge0 docker-compose (v1)

Add to **`backend/docker-compose.yml`** after postgres/redis (Phase 4). Run `docker compose` from the `backend/` directory.

Use the official CE shape: a Judge0 **server** container plus a Judge0 **workers** container. `/about` only proves the API server is up; `/workers` must show at least one available worker before XYZ submissions can execute.

Create `backend/judge0.conf` from `backend/judge0.conf.example`, set real `POSTGRES_PASSWORD` and `REDIS_PASSWORD`, and keep `backend/judge0.conf` uncommitted.

```yaml
  judge0-db:
    image: postgres:16.2
    env_file: judge0.conf
    volumes:
      - judge0-data:/var/lib/postgresql/data

  judge0-redis:
    image: redis:7.2.4
    command:
      - bash
      - -c
      - docker-entrypoint.sh --appendonly no --requirepass "$$REDIS_PASSWORD"
    env_file: judge0.conf

  judge0-server:
    image: judge0/judge0:1.13.1
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    depends_on:
      - judge0-db
      - judge0-redis
    ports:
      - "2358:2358"
    privileged: true
    restart: always

  judge0-workers:
    image: judge0/judge0:1.13.1
    command: ["./scripts/workers"]
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    depends_on:
      - judge0-db
      - judge0-redis
    privileged: true
    restart: always

volumes:
  judge0-data:
```

- API/worker use `JUDGE0_URL=http://judge0-server:2358` when running inside compose
- Host dev: `JUDGE0_URL=http://localhost:2358`

## Judge0 first-time bring-up (Phase 4)

Run once when adding Judge0 to the stack:

1. **Start sidecars first:** `docker compose up -d judge0-db judge0-redis` — wait until postgres accepts connections (~10–30s).
2. **Start Judge0 server + workers:** `docker compose up -d judge0-server judge0-workers` — API on port **2358**.
3. **Health:** `curl -s http://localhost:2358/about` (or `/system_info` depending on image) returns JSON without connection refused.
4. **Workers:** `curl -s http://localhost:2358/workers` — confirm `available >= 1`. If `available` is 0, XYZ submissions will remain queued or time out even though `/about` works.
5. **Languages:** `curl -s http://localhost:2358/languages` — confirm entries with id **71** (Python 3) and **63** (JavaScript / Node). If IDs differ, update `config.py` / Phase 4 language map to match **your** CE image.
6. **Smoke execute:** submit a trivial Python snippet via Judge0 API and poll/get result; expect `status.id == 3` (Accepted).
7. **App wiring:** API + XYZ worker containers use `JUDGE0_URL=http://judge0-server:2358` (service name). Host-only uvicorn uses `http://localhost:2358`.

| Symptom | Likely fix |
|---------|------------|
| Connection refused on 2358 | `judge0-server` not up; check `docker compose ps` and logs |
| `/about` works but submissions never finish | `judge0-workers` missing/down; check `/workers` for `available >= 1` |
| Judge0 exits / OOM | Allocate ≥2 GB RAM to Docker; reduce parallel compose services |
| Submissions `RUNTIME_ERROR` "Judge unavailable" | Wrong URL (host vs compose network), or Judge0 still starting |
| Wrong language id | Re-verify `/languages`; do not assume 71/63 on custom images |
| Port 2358 in use | Change host port mapping or stop conflicting service |

After Judge0 server and Judge0 workers are healthy, start the **XYZ Platform `worker`** (see [Submission worker](#submission-worker-v1)) before testing submits. This is separate from `judge0-workers`.

## Judge0 CE limits (v1)

| Limit | Notes |
|-------|--------|
| RAM | Allocate ~2 GB+ for Judge0 + its postgres/redis sidecars on dev machines |
| Sequential tests | Worker runs one Judge0 call per test case in v1 (simple, slower) |
| HTTP errors | Map to submission `RUNTIME_ERROR`; do not leave row in `RUNNING` |
| Verify execution | After `docker compose up`, `GET /workers` must show `available >= 1`, then `GET /languages` must confirm IDs **71** (Python) and **63** (JavaScript) |

## Submission worker (v1)

Add after Judge0 (Phase 4). Without this service, submissions remain `PENDING`.

Create `backend/Dockerfile` before adding these services; both `api` and `worker` use `build: .`.

```yaml
  api:
    build: .   # context: backend/ (directory containing this compose file)
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - judge0-server
    environment:
      DATABASE_URL: postgresql+asyncpg://xyz_platform:xyz_platform@postgres:5432/xyz_platform
      REDIS_URL: redis://redis:6379/0
      JUDGE0_URL: http://judge0-server:2358

  worker:
    build: .
    command: python -m app.workers.submission_worker
    depends_on:
      - postgres
      - redis
      - judge0-server
      - judge0-workers
    environment:
      DATABASE_URL: postgresql+asyncpg://xyz_platform:xyz_platform@postgres:5432/xyz_platform
      REDIS_URL: redis://redis:6379/0
      JUDGE0_URL: http://judge0-server:2358
    restart: unless-stopped
    deploy:
      replicas: 1   # v1: single worker; no distributed job lock
```

**Local without Docker:** from `backend/`, run `uvicorn app.main:app --reload` and **one** `python -m app.workers.submission_worker` in a second terminal. Do not start multiple workers in v1.

## Redis keys

| Key | TTL | Use |
|-----|-----|-----|
| `ratelimit:submit:{user_id}` | 60s | submit count |
| `ratelimit:ip:{ip}` | 60s | request count |
| `submission_queue` | - | LIST; each value is JSON `{"submission_id":"<uuid>"}` |
| `leaderboard:all` | 60s | cached all-time board — **DEL after scoring DB commit** (not inside SQL txn) |
| `leaderboard:week` | 60s | cached weekly board — **DEL after scoring DB commit** |

## Deploy (minimal)

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│ Frontend│────▶│ FastAPI │────▶│ Postgres │
│ (Vite)  │     │ + Worker│     └──────────┘
└─────────┘     │    │    │     ┌──────────┐
                │    └────┼────▶│ Redis    │
                │         │     └──────────┘
                └─────────┼────▶ Judge0 (Docker)
                          │
```

- **Dev:** docker-compose all services
- **Prod:** Railway/Render API + managed Postgres + Redis; Judge0 on VPS or hosted Judge0 API

## Logging

- Structlog or JSON logs
- Log: submission_id, status, runtime — **never log full source in prod**

## Frontend contract (LeetCode UI)

| Page | API |
|------|-----|
| Problem list | GET /problems |
| Problem solve | GET /problems/{slug} + POST /submissions + poll GET /submissions/{id} |
| Profile | GET /users/me/stats |
| Leaderboard | GET /leaderboard |
| Auth modal | POST /auth/login, register |

## Testing strategy

| Layer | Tool |
|-------|------|
| Unit | pytest — scoring_service, output_compare, code_wrapper |
| API | httpx AsyncClient — auth, problems |
| Integration | docker-compose + full submit flow (Phase 4–5) |

## requirements.txt (core)

```
fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg psycopg2-binary alembic
pydantic-settings email-validator python-jose[cryptography] passlib[bcrypt]
redis httpx pytest pytest-asyncio
```
