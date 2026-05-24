# Verification And QA Plan

Use this checklist after each implementation phase.

## Standard Commands

Expected commands after Phase 1 creates the app:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

If a command is not available yet, add it in the phase where the relevant tooling is introduced.

## Browser Verification

After meaningful UI changes:

- start the frontend dev server,
- open the route in the in-app browser,
- verify desktop and mobile viewport behavior,
- check that no text overlaps,
- check loading, empty, success, and error states where practical,
- verify Monaco renders when the solve page is implemented.

Suggested local URL:

```text
http://localhost:5173
```

## Phase Checklists

### Phase 1

- app starts,
- routes render shell pages,
- nav works,
- Tailwind styles load,
- base components render all key states,
- mobile nav/layout works,
- lint/typecheck/build pass.

### Phase 2

- register works against live backend,
- login works against live backend,
- session persists after refresh,
- logout clears token and cache,
- protected route redirects anonymous user,
- admin route blocks non-admin user,
- validation and auth errors are readable,
- 401 clears session.

### Phase 3

- problem list works with fixtures or live API,
- URL search params control filters,
- pagination is stable,
- tag filter supports exact tag names,
- empty state appears for no results,
- API errors show retry state,
- table is readable on mobile.

### Phase 4

- problem detail renders with fixture or live data,
- templates load per language,
- editor draft persists per problem/language,
- Run creates `run_samples_only: true`,
- Submit creates `run_samples_only: false`,
- poll stops on terminal statuses,
- score poll runs only after `ACCEPTED`,
- `SAMPLE_PASSED` does not mark solved,
- result panel hides hidden test I/O,
- 429 shows rate-limit toast,
- mobile solve tabs work.

### Phase 5

- profile route requires auth,
- stats zero state renders,
- stats with data render correctly,
- submission history paginates,
- status badges match submission statuses,
- activity heatmap is honest about data availability,
- date and runtime formatting are consistent.

### Phase 6

- leaderboard works anonymously,
- all-time and weekly toggles call the right query,
- current and documented backend response shapes normalize correctly,
- rank order displays as returned,
- mobile table remains usable.

### Phase 7

- admin route requires admin role,
- create form validates client-side,
- JSON test input/output validation works,
- JavaScript `kwargs` is blocked,
- sample/hidden minimums are enforced,
- unpublish confirmation works,
- payload can be adapted to final backend contract.

### Phase 8

- production build succeeds,
- Playwright smoke flows pass,
- no major accessibility violations,
- no obvious layout overlap at mobile/tablet/desktop,
- API error states audited,
- backend dependency list is empty or explicitly deferred.

## Suggested Test Coverage

Unit tests:

- API normalizers,
- status helpers,
- format helpers,
- auth provider behavior,
- form validation helpers,
- polling stop-condition helpers.

Component tests:

- auth forms,
- problem filters,
- problem table,
- result panel,
- stats cards,
- admin validation summary.

E2E smoke tests:

- register -> logout -> login,
- problem list filters,
- solve Run with sample success,
- solve Submit with accepted reference solution,
- profile stats,
- leaderboard toggle,
- admin create/unpublish when backend routes exist.

## Live Backend Verification Prerequisites

For full solve flow:

```bash
cd backend
docker compose up -d postgres redis judge0-db judge0-redis judge0-server judge0-workers
alembic upgrade head
python scripts/seed_problems.py
docker compose up -d api worker
```

Then verify:

- `GET http://localhost:8000/api/v1/health` returns `status: ok` or clearly shows which dependency is degraded,
- Judge0 `/workers` reports at least one available worker,
- seeded problems are available through the current problem routes,
- the XYZ worker is running before testing Run/Submit.

## Known Risks

| Risk | Mitigation |
| --- | --- |
| Current route layout differs from docs | Use endpoint definitions and normalizers so `/problems/tags` can later move to `/tags` and admin actions can later move to `/admin/*`. |
| Some admin actions are missing | Use fixtures for missing delete/add-test-case flows; track live-backend dependency. |
| API response shapes differ between docs and code | Normalize in client adapters. |
| Leaderboard route has trailing slash | Use `/leaderboard/` in client or handle redirects. |
| Scoring can lag after `ACCEPTED` | Score polling timeout and pending score UI. |
| Heatmap data not fully available | Render no-data or limited-derived state; do not overclaim. |
| Monaco bundle size | Lazy-load solve page/editor route. |
| Token expiry during polling | Clear session on 401 and stop active polls. |

## Definition Of Done For Frontend

- app builds for production,
- all planned routes are implemented,
- live backend flows work where backend endpoints exist,
- documented backend gaps are resolved or deferred,
- reusable components are used instead of duplicated one-off UI,
- accessibility and responsive checks pass,
- final README includes frontend setup and run commands.
