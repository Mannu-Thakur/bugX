# 13 — Plan Verification Checklist

Use this after any plan edit. **All items must pass** before calling the plan implementation-ready.

## Phase boundaries

| # | Check | Status |
|---|--------|--------|
| 1 | Build order 1→2→3→4→5→6 documented in README | pass |
| 2 | Phase 4 worker does **not** call `ScoringService` | pass |
| 3 | Phase 3 `user_status` stub; Phase 4 live queries | pass |
| 4 | Phase 5 adds scoring as final worker step | pass |
| 5 | Seed runs after Phase 3 migrations | pass |

## API contract (07-api-routes)

| # | Check | Status |
|---|--------|--------|
| 6 | Pagination defaults `page=1`, `limit=20`, max 100 | pass |
| 7 | `GET /tags` public list | pass |
| 8 | `GET /problems?tag=` exact case-sensitive name | pass |
| 9 | `GET /problems/{slug}` optional auth; invalid Bearer → 401 | pass |
| 10 | `ProblemCreate`, `ProblemUpdate`, `TestCaseCreate`, `TagCreate` schemas | pass |
| 11 | Register email/username/password validation | pass |
| 12 | Router mount table in 07 | pass |
| 13 | Admin prefix `/api/v1/admin` | pass |

## Data & migrations

| # | Check | Status |
|---|--------|--------|
| 14 | `submission_status` includes `SAMPLE_PASSED` in Phase 4 migration | pass |
| 15 | Alembic sync URL vs async runtime URL | pass |
| 16 | `submissions.updated_at` on status transitions | pass |

## Judge & worker

| # | Check | Status |
|---|--------|--------|
| 17 | Redis queue JSON payload `{"submission_id":"..."}` | pass |
| 18 | Worker required; stale RUNNING reclaim documented | pass |
| 19 | v1 single worker replica; process only `PENDING` rows | pass |
| 20 | Judge0 language IDs verify step documented | pass |

## Scoring & UX

| # | Check | Status |
|---|--------|--------|
| 21 | Qualifying = `ACCEPTED` + `run_samples_only=false` | pass |
| 22 | `best_score` null when max score 0 | pass |
| 23 | `solved` true can coexist with `best_score` null | pass |
| 24 | No partial credit; `total_score` recompute | pass |
| 25 | Leaderboard cache DEL after DB commit | pass |

## Seed & templates

| # | Check | Status |
|---|--------|--------|
| 26 | [12-seed-problems-spec.md](./12-seed-problems-spec.md) canonical for 5 problems | pass |
| 27 | Phase 3 arg_style table defers to seed spec | pass |
| 28 | Seed uses repos directly (no HTTP) | pass |

## Frontend (Phase 6)

| # | Check | Status |
|---|--------|--------|
| 29 | Stack locked: react-router-dom v6 + Tailwind | pass |
| 30 | Tag filter uses `GET /tags` | pass |
| 31 | Score poll only on `ACCEPTED` terminal | pass |

## Doc hygiene

| # | Check | Status |
|---|--------|--------|
| 32 | README has single “Resolved decisions” table (no duplicates) | pass |
| 33 | Cross-links between phase docs and 07/08/12 | pass |

## Fixes (compose, reclaim, validation)

| # | Check | Status |
|---|--------|--------|
| 34 | `docker-compose.yml` only at `backend/`; all docs agree; compose run from `backend/` | pass |
| 35 | `judge_service.run` deletes `submission_results` at start; `UNIQUE(submission_id, test_case_id)` | pass |
| 36 | Stale reclaim resets judge counters; re-judge does not duplicate result rows | pass |
| 37 | Admin rejects `javascript` + `kwargs` (**422**); seed uses positional/single for JS | pass |
| 38 | Pagination `pages = 0` when `total == 0` | pass |
| 39 | Health `judge0` field documented for Phase 4+ | pass |
| 40 | `scripts/rescore_submission.py` documented for scoring recovery (Phase 5) | pass |

---

**Result:** 40/40 pass — plan is implementation-ready with **0 open issues** as of last edit.

When you change behavior, update the relevant phase doc **and** this checklist row.
