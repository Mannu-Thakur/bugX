# Phase-Wise Frontend Implementation Plan

Each phase must be independently usable. A phase is complete only when the app compiles, the phase route works, relevant tests/checks pass, and any live-backend dependency is documented.

## Phase 0 - Branch And Planning

Status: complete for this planning task.

Deliverables:

- branch `frontend`,
- root `frontend/` directory,
- phase-wise planning docs under `frontend/docs/plans`.

Acceptance:

- docs explain backend contract, gaps, architecture, phases, API client, UI system, and QA.

## Phase 1 - Bootstrap, Tooling, App Shell

Goal:

Create the React app foundation without depending on feature APIs.

Backend dependency:

- optional `GET /api/v1/health` for a dev status indicator.

Deliverables:

- Vite React TypeScript app,
- Tailwind setup,
- React Router v6,
- TanStack Query provider,
- app shell with nav and responsive layout,
- shared env config,
- shared base UI primitives: button, icon button, input, select, badge, tabs, modal, toast, table shell, pagination shell,
- 404 page,
- basic health check hook if useful.

Reusable components introduced:

- `Button`, `IconButton`, `Input`, `Select`, `Badge`, `Tabs`, `Modal`, `Toast`, `PageShell`, `DataTable`, `Pagination`.

Acceptance:

- `npm run dev` starts the app,
- `/`, `/problems`, `/leaderboard`, `/login`, `/register` routes render shells,
- no route depends on missing backend data,
- UI is responsive at desktop and mobile widths,
- lint/typecheck pass.

## Phase 2 - Auth And Session

Goal:

Implement registration, login, logout, session hydration, and protected routing.

Backend dependency:

- `POST /api/v1/auth/register`,
- `POST /api/v1/auth/login`,
- `GET /api/v1/users/me`,
- `PATCH /api/v1/users/me`.

Deliverables:

- API client with auth header injection,
- error normalization,
- `AuthProvider`,
- `useAuth`,
- login/register pages,
- logout action,
- protected route and admin route wrappers,
- profile edit basics for username/avatar if included in shell.

Reusable components introduced or hardened:

- `AuthForm`, `FormField`, `PasswordInput`, `InlineError`, `UserMenu`.

Acceptance:

- user can register and is logged in,
- user can log in with existing credentials,
- refresh hydrates session from stored token,
- invalid/expired token logs out cleanly on 401,
- protected routes redirect to login,
- admin routes require `role === "ADMIN"`,
- auth tests cover success, validation display, and logout.

## Phase 3 - Problem Catalog

Goal:

Build the public problem set table with search, filters, sort, and pagination.

Backend dependency:

- live: `GET /api/v1/problems`,
- live current: `GET /api/v1/problems/tags`,
- documented target: `GET /api/v1/tags`.

Current backend note:

- problem list is mounted under `/api/v1/problems`.
- tag list currently lives under `/api/v1/problems/tags`, not canonical `/api/v1/tags`.

Deliverables:

- problem list API functions and normalizers,
- tag list API function,
- URL-backed filters: page, limit, difficulty, tag, search, sort,
- problem table with status slot, title, difficulty, acceptance, score/base, tags,
- loading, empty, and error states,
- responsive table behavior.

Reusable components introduced:

- `ProblemTable`, `ProblemFilters`, `DifficultyBadge`, `AcceptanceCell`, `SearchInput`, `TagFilter`, `TableSkeleton`.

Acceptance:

- `/problems` is usable with fixture data or live API,
- filters are reflected in URL search params,
- table layout does not shift between loading/empty/data states,
- unknown tag can display empty state without treating it as an error,
- problem row links to `/problems/:slug`.

## Phase 4 - Solve Workspace, Run, Submit, Polling

Goal:

Implement the core LeetCode-style solve page.

Backend dependency:

- live: `GET /api/v1/problems/{slug}`,
- live: `POST /api/v1/submissions`,
- live: `GET /api/v1/submissions/{id}`,
- live: `GET /api/v1/submissions/{id}/results`,
- live: `GET /api/v1/problems/{slug}/submissions/best`.

Current backend note:

- problem detail currently returns templates as an array and sample tests as `sample_test_cases`; normalize before rendering.

Deliverables:

- solve page layout with statement, editor, controls, tests/results,
- Monaco editor,
- language toggle for `python` and `javascript`,
- template loading per language,
- local draft persistence per problem/language,
- Run action using `run_samples_only: true`,
- Submit action using `run_samples_only: false`,
- polling until terminal status,
- score polling after `ACCEPTED`,
- sample result panel,
- status and score badges,
- rate-limit toast,
- best solution fetch when supported.

Reusable components introduced:

- `SplitPane`, `ProblemStatement`, `CodeEditor`, `LanguageTabs`, `SubmissionControls`, `TestCaseList`, `TestResultPanel`, `StatusBadge`, `ScoreBadge`, `RuntimeMemoryStats`.

Acceptance:

- user can switch languages without losing drafts,
- Run shows `SAMPLE_PASSED` as sample success and does not mark solved,
- Submit shows `ACCEPTED` only for full pass,
- `ACCEPTED` with `score === 0` shows scoring pending until timeout,
- failures stop score polling,
- sample result I/O is shown only when returned,
- hidden test I/O is never invented or displayed,
- route works on desktop and mobile.

## Phase 5 - Profile, Submission History, Analytics Components

Goal:

Implement user stats, submission history, and reusable analytics display components.

Backend dependency:

- `GET /api/v1/users/me/stats`,
- `GET /api/v1/users/me/submissions`.

Deliverables:

- profile page,
- stats cards: solved, score, streaks, difficulty breakdown,
- submissions history table with pagination,
- analytics components for solved breakdown, score summary, and activity heatmap shell,
- graceful handling for missing problem title/slug in current submission history response.

Reusable components introduced:

- `StatsCards`, `DifficultyBreakdown`, `ActivityHeatmap`, `SubmissionHistoryTable`, `MetricCard`, `MiniBarChart`, `DonutChart`.

Acceptance:

- `/profile` requires login,
- stats load and display zero state cleanly,
- submission rows show status, language, score, runtime, created date, and run-vs-submit,
- history pagination works,
- heatmap does not claim data that the backend does not provide,
- analytics components are reusable outside profile.

## Phase 6 - Leaderboard

Goal:

Implement public weekly and all-time leaderboard.

Backend dependency:

- live: `GET /api/v1/leaderboard/?period=all|week&limit=50`.

Deliverables:

- leaderboard API normalizer for current list response and documented envelope response,
- all-time/week segmented control,
- rank table,
- loading, empty, and error states,
- cache refresh behavior.

Reusable components introduced:

- `LeaderboardTable`, `RankCell`, `SegmentedControl`.

Acceptance:

- `/leaderboard` works anonymously,
- all-time and weekly modes normalize to the same UI row shape,
- ties and ranks display correctly as returned,
- table remains readable on mobile.

## Phase 7 - Admin Problem Management

Goal:

Implement admin workflows for problem creation, updates, unpublish, tags, templates, and test cases.

Backend dependency:

- live current: admin create/update/tag actions under `/api/v1/problems`,
- documented target: `/api/v1/admin/*`,
- live current: `GET /api/v1/problems/tags`,
- live: `GET /api/v1/problems`.

Current backend note:

- current backend has no `/api/v1/admin` prefix.
- current create problem uses `tag_ids`, not `tag_names`.
- current create problem always starts unpublished; publish through `PATCH /api/v1/problems/{slug}`.
- dedicated delete/unpublish-by-id and append-test-cases routes are not present yet.

Deliverables:

- admin layout and route protection,
- problems admin table,
- create problem form,
- update non-structural fields form,
- unpublish confirmation modal,
- tag picker,
- template editor for python/javascript,
- test-case JSON editor with sample/hidden validation,
- client-side validation matching backend docs.

Reusable components introduced:

- `AdminLayout`, `ProblemForm`, `TemplateEditor`, `TestCaseEditor`, `JsonTextarea`, `TagPicker`, `ConfirmModal`, `ValidationSummary`.

Acceptance:

- non-admin users cannot access admin routes,
- admin can draft a valid problem payload,
- client validates at least one sample and at least three hidden tests,
- client rejects JavaScript `kwargs`,
- client validates JSON input/output before submit,
- unpublish action requires confirmation,
- form can adapt to `tag_names` documented target or `tag_ids` current schema once backend shape is finalized.

## Phase 8 - Polish, QA, And Release Readiness

Goal:

Stabilize the full frontend and verify end-to-end workflows.

Backend dependency:

- full backend stack running: Postgres, Redis, Judge0 server, Judge0 workers, API, XYZ worker, migrations, seed data.

Deliverables:

- final responsive pass,
- accessibility pass,
- performance pass for Monaco and tables,
- Playwright smoke flows,
- API error state audit,
- loading/skeleton audit,
- copy and formatting pass,
- docs update for frontend run commands.

Acceptance:

- register/login smoke passes,
- problem list smoke passes,
- solve run/submit smoke passes with seeded reference solution,
- profile and leaderboard smoke pass,
- admin smoke passes when backend admin routes exist,
- no known overlapping text or unstable layouts,
- production build succeeds.
