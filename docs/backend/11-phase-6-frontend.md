# Implementation Phase 6 — Frontend

**Goal:** LeetCode-inspired SPA wired to backend v1 APIs. UI map: [10-frontend-ui-map.md](./10-frontend-ui-map.md).

**Prerequisites:** Backend Phases 1–5 deployed locally:

1. `cd backend && docker compose up -d postgres redis judge0-db judge0-redis judge0-server judge0-workers`
2. Verify Judge0 server + workers per [09-env-security.md](./09-env-security.md#judge0-first-time-bring-up-phase-4), especially `/workers` showing `available >= 1`
3. `alembic upgrade head` + `python scripts/seed_problems.py` ([12-seed-problems-spec.md](./12-seed-problems-spec.md))
4. `docker compose up -d api worker` — start API and XYZ worker after migrations/seed

## Stack (locked for v1)

| Choice | Package / notes |
|--------|-----------------|
| Framework | React 18 + Vite |
| Routing | **react-router-dom v6** (`BrowserRouter`, nested routes) |
| Styling | **Tailwind CSS** (no MUI in v1 — keeps bundle smaller) |
| Data | TanStack Query v5 (polling for submissions) |
| Editor | `@monaco-editor/react` |
| Auth | Access JWT in memory + `localStorage`; `Authorization: Bearer` on protected calls |

## Tasks

### Bootstrap

- [ ] `frontend/` Vite app; `VITE_API_URL=http://localhost:8000/api/v1`
- [ ] `react-router-dom` routes: `/`, `/problems`, `/problems/:slug`, `/profile`, `/leaderboard`, `/admin/*`
- [ ] API client (fetch) with base URL + auth header injection
- [ ] React Query provider + global error/toast handler

### Auth (Phase 2 APIs)

- [ ] Login / Register pages → `POST /auth/login`, `/auth/register`
- [ ] Persist token; `ProtectedRoute` redirects if missing
- [ ] `GET /users/me` on app load to hydrate profile
- [ ] Logout clears token + cache

### Problem list (Phase 3)

- [ ] `GET /problems` with pagination (`page`, `limit`), difficulty, search
- [ ] Tag filter dropdown populated from `GET /tags`; pass selected name as `?tag=` (case-sensitive)
- [ ] Table: title, difficulty badge, acceptance % (null → display “—”)
- [ ] Row link → `/problems/:slug`

### Solve page (Phases 3–5)

- [ ] `GET /problems/{slug}` with Bearer when logged in
- [ ] Language toggle: **python** \| **javascript**; load `templates[lang]`
- [ ] Monaco editor bound to source state
- [ ] **Run** → `POST /submissions` `{ run_samples_only: true }` → poll until terminal
  - [ ] `SAMPLE_PASSED` → green sample results; do **not** mark solved
- [ ] **Submit** → `{ run_samples_only: false }` → poll until terminal
  - [ ] `ACCEPTED` → poll until `score > 0` **or** ~60s timeout → “Score unavailable” + refresh hint
  - [ ] Failures → show status; do not wait for score
- [ ] `GET /submissions/{id}/results` for sample pass/fail panel
- [ ] **View best solution** → `GET /problems/{slug}/submissions/best` (404 hidden if never solved)
- [ ] Solved checkmark from `user_status.solved`; show score badge only when `best_score != null`
- [ ] **429** toast on Run/Submit

### Profile & history (Phase 5)

- [ ] `/profile` → `GET /users/me/stats`
- [ ] Submissions tab → `GET /users/me/submissions` paginated

### Leaderboard (Phase 5)

- [ ] `GET /leaderboard?period=all|week` toggle

### Admin (Phase 3 — ADMIN only)

- [ ] `AdminRoute` checks `user.role === 'ADMIN'` from `/users/me`
- [ ] Create problem form → `POST /admin/problems` per `ProblemCreate` schema
- [ ] Unpublish → `DELETE /admin/problems/{id}`
- [ ] Dev: seed admin login

## Polling rules

| Action | Stop condition |
|--------|----------------|
| Run / Submit | `status` not in `PENDING`, `RUNNING` |
| Submit success | Additionally `score > 0` when `status === ACCEPTED`, **or** timeout (~60s) |
| Run success | `SAMPLE_PASSED` — no score poll |

Poll interval: 1–2s.

## Components (minimum)

`Layout`, `Navbar`, `ProblemTable`, `TagFilter`, `ProblemPanel`, `CodeEditor`, `TestResultPanel`, `AuthForm`, `ScoreBadge`, `LeaderboardTable`, `StatsCards`, `ProtectedRoute`, `AdminRoute`

## Done when

- [ ] All routes work with react-router-dom
- [ ] Tag filter uses `GET /tags`
- [ ] Solve page handles `solved` vs `best_score` independently
- [ ] Profile and leaderboard wired
- [ ] Admin create/unpublish with seed admin
- [ ] No refresh-token calls

## Tests (optional v1)

- Smoke: login → list → solve → Run → Submit (reference solution)
- E2E (Playwright): auth + tag filter + submit poll against docker-compose backend
