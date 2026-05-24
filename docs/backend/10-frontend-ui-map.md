# Frontend UI Map (LeetCode-inspired)

Backend APIs consumed per page.

**When to start:** Bootstrap + auth shell after Phase 2. **Solve page, submissions, leaderboard, and stats require backend Phases 3–5** — see prerequisites in [11-phase-6-frontend.md](./11-phase-6-frontend.md).

| Page | Layout | APIs |
|------|--------|------|
| **Login/Register** | Center card, split hero | POST `/auth/register`, `/auth/login` |
| **Problem set** | Table: status icon, title, difficulty, acceptance; tag filter | GET `/problems`, GET `/tags` |
| **Solve** | 3-pane: desc \| Monaco editor \| tests/results | GET `/problems/{slug}`, POST/GET `/submissions` |
| **Submissions tab** | List runtime, status, language | GET `/users/me/submissions` |
| **Profile** | Stats cards + streak + solved breakdown | GET `/users/me/stats` |
| **Leaderboard** | Rank table | GET `/leaderboard?period=all\|week` |
| **Admin** | Problem form + test case JSON upload | `/admin/*` |

## Solve page UX

- Language dropdown → **python** or **javascript** only; load template from `problem.templates[language]`
- **Run** → `POST /submissions` with `run_samples_only: true`, poll until terminal
  - Success → status `SAMPLE_PASSED` (show sample pass UI; **do not** treat as problem solved)
- **Submit** → `POST /submissions` with `run_samples_only: false`, poll until terminal
  - Success → status `ACCEPTED`; then poll until `score > 0` (Phase 5 worker) **or timeout** (e.g. 60s / 30 polls) — show “Score unavailable” and suggest refresh. Stop polling on failure statuses — they keep `score = 0`
- **429** on submit → toast “Rate limit — try again in a minute”
- **`user_status.solved`:** may be true while `best_score` is still null (AC recorded, scoring pending)
- **`user_status.best_score`:** show only when API returns non-null (null = no AC yet or scoring pending)
- Results panel: green/red per sample; badge for `WRONG_ANSWER`, `TIME_LIMIT`, etc.
- `user_status.solved` on problem detail — qualifying full submit only (`ACCEPTED`, not Run)
- Both Run and Submit consume submit rate limit (10/min)

## Components

`Layout`, `Navbar`, `ProblemTable`, `ProblemPanel`, `CodeEditor` (Monaco), `TestResultPanel`, `AuthModal`, `ScoreBadge`

## Stack

React 18 + Vite + **react-router-dom v6** + **Tailwind CSS** + TanStack Query + Monaco — locked in [11-phase-6-frontend.md](./11-phase-6-frontend.md)

## Done when (Phase 6)

See full checklist: [11-phase-6-frontend.md](./11-phase-6-frontend.md).
