# XYZ Platform — Requirements (v1)

Product requirements for the LeetCode-inspired coding judge. Implementation detail lives in [backend/](./backend/README.md) phase docs.

## 1. Product vision

| Item | Requirement |
|------|-------------|
| Product | Browser-based coding practice platform (submit code → run tests → score) |
| v1 scope | Auth, problem catalog, Run (samples), Submit (all tests), scoring, leaderboards, admin CRUD |
| Out of scope v1 | Refresh tokens, C++, partial credit, plagiarism, live collab, WebSocket (poll only) |

## 2. Users & roles

| Role | Capabilities |
|------|----------------|
| **Anonymous** | List problems, view problem detail (samples only), leaderboard |
| **USER** | Register, login, submit/run code, profile, stats, submission history |
| **ADMIN** | Create/update/unpublish problems, add test cases, create tags (via seed or API) |

## 3. Functional requirements

### 3.1 Authentication

- Register with email, username, password (validated)
- Login returns JWT access token (60 min TTL)
- No refresh tokens in v1
- Inactive users: login **403**, protected routes **403**
- `GET/PATCH /users/me` for profile

### 3.2 Problems

- Public list with pagination, filters: difficulty, tag (case-sensitive), search, sort (title / acceptance)
- Problem detail: markdown description, templates (python, javascript), sample tests only
- Optional auth on detail: live `user_status` when logged in (Phase 4+)
- Admin: create problem with templates + test cases (≥1 sample, ≥3 hidden)
- Admin: unpublish only (no hard delete)

### 3.3 Submissions & judge

- **Run:** `run_samples_only=true` → sample tests only → terminal `SAMPLE_PASSED` (never `ACCEPTED`)
- **Submit:** `run_samples_only=false` → all tests → `ACCEPTED` if all pass
- Languages: python, javascript only
- Queue: Redis `submission_queue`, worker required
- Owner-only read of submission + results; hidden test I/O never in public APIs
- Rate limit: 10 POST /submissions per user per minute (Run + Submit)

### 3.4 Scoring & stats (Phase 5)

- Score only on qualifying full pass (`ACCEPTED` + `run_samples_only=false`)
- Formula: `score_base` + runtime bonus; no partial credit
- `user_stats`: first AC per problem increments solve counts; `total_score` recomputed from DB
- Acceptance rate per problem (full submits only)
- Weekly and all-time leaderboards with Redis cache

### 3.5 Frontend (Phase 6)

- React 18 + Vite + react-router-dom v6 + Tailwind + Monaco + TanStack Query
- Solve page: Run / Submit with polling; score poll on `ACCEPTED` until `score > 0` or timeout
- Tag filter via `GET /tags`

## 4. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Security | bcrypt passwords, JWT from env, user code only in Judge0 sandbox |
| Performance | Sequential Judge0 calls v1; leaderboard cache TTL 60s |
| Reliability | Stale `RUNNING` reclaim; idempotent judge via delete+reinsert results |
| Ops | Single worker replica v1; `scripts/rescore_submission.py` for scoring recovery |
| Data | PostgreSQL relational schema; Alembic migrations per phase |

## 5. Data requirements

- 5 seed problems per [backend/12-seed-problems-spec.md](./backend/12-seed-problems-spec.md)
- Each problem: 2 sample + 5 hidden tests; dual-language templates
- First admin via `SEED_ADMIN_*` env in seed script

## 6. API requirements

Full REST contract: [backend/07-api-routes.md](./backend/07-api-routes.md)

## 7. Verification

Plan completeness: [backend/13-plan-verification.md](./backend/13-plan-verification.md) (40/40 checks).

## 8. Related documents

| Document | Path |
|----------|------|
| **UML class & state diagrams** | [diagrams/uml-specification.md](./diagrams/uml-specification.md) |
| Stack comparison (MERN vs FastAPI) | [comparison/mern-vs-fastapi.md](./comparison/mern-vs-fastapi.md) |
| Plan readiness analysis | [analysis/plan-readiness-review.md](./analysis/plan-readiness-review.md) |
| Plan fixes log | [analysis/plan-fixes-applied.md](./analysis/plan-fixes-applied.md) |
| Implementation phases | [backend/README.md](./backend/README.md) |
