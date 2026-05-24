# Plan Fixes Applied — XYZ Platform

Log of documentation fixes applied to make the plan implementation-ready and to separate the project as **xyz_plateform**.

## 1. Project separation

| Action | Detail |
|--------|--------|
| New repo root | `xyz_plateform/` — dedicated Git repository |
| Removed | Legacy `code-judge/` folder; split from unrelated projects |
| Rebrand | CodeForge → XYZ Platform |
| Env names | Postgres user/db `xyz_platform`; admin email `admin@xyz-platform.local` |

## 2. Docker Compose location

| Before | After |
|--------|-------|
| Mixed “repo root” vs `backend/docker-compose.yml` | Single path: **`backend/docker-compose.yml`**; run compose from **`backend/`** |

**Files updated:** `02-phase-1-setup.md`, `09-env-security.md`, `README.md` (backend + root).

## 3. Judge reclaim & idempotency

| Fix | Detail |
|-----|--------|
| `judge_service.run` | Delete all `submission_results` at start; reset judge counters |
| DB | `UNIQUE(submission_id, test_case_id)` |
| Reclaim | Set `PENDING`, reset counters, re-enqueue; judge handles result cleanup |

**Files updated:** `05-phase-4-judge.md`, `01-database-models.md`, `08-controllers-services.md`, backend README.

## 4. JavaScript `kwargs` guard

| Fix | Detail |
|-----|--------|
| Admin API | `javascript` + `kwargs` → **422** |
| Wrapper | `CodeWrapperService` raises for JS kwargs (defense in depth) |

**Files updated:** `07-api-routes.md`, `04-phase-3-problems.md`, `05-phase-4-judge.md`.

## 5. Other completeness

| Topic | Fix |
|-------|-----|
| Pagination | `pages = 0` when `total == 0` |
| Health Phase 4+ | Add `judge0` probe field |
| Scoring recovery | `scripts/rescore_submission.py` documented |
| PATCH /users/me | Sets `users.updated_at` |

## 6. Checklist extension

`13-plan-verification.md` extended from 33 → **40** items (checks 34–40 for fixes above).

## Related

- [plan-readiness-review.md](./plan-readiness-review.md)
- [../backend/13-plan-verification.md](../backend/13-plan-verification.md)
