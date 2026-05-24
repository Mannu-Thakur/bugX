# Frontend Phase Planning Prompt

Use this prompt before starting each frontend implementation phase.

```text
You are implementing the XYZ Platform frontend on the `frontend` branch.

Goal:
Build a LeetCode-style React SPA for the existing FastAPI backend. Implement one frontend phase at a time, keeping each phase independently usable, verified, and modular.

Source of truth:
- frontend/docs/plans/README.md
- frontend/docs/plans/01-backend-contract-analysis.md
- frontend/docs/plans/02-frontend-architecture.md
- frontend/docs/plans/03-phase-wise-implementation-plan.md
- frontend/docs/plans/04-api-client-and-contract-plan.md
- frontend/docs/plans/05-ui-component-system-plan.md
- frontend/docs/plans/06-verification-and-qa-plan.md
- docs/requirements.md
- docs/backend/07-api-routes.md
- docs/backend/10-frontend-ui-map.md
- docs/backend/11-phase-6-frontend.md
- actual backend code under backend/app

Stack:
- React 18
- Vite
- TypeScript unless the user explicitly changes this
- React Router v6
- Tailwind CSS
- TanStack Query v5
- @monaco-editor/react
- lucide-react for icons
- fetch-based API client

Design direction:
- LeetCode-style, work-focused, dense but readable.
- No marketing landing page as the first screen.
- Reusable UI primitives for buttons, icon buttons, inputs, selects, tabs, modals, tables, badges, cards, charts, graphs, heatmaps, pagination, and empty states.
- Solve page is a true coding workspace with problem statement, editor, and tests/results visible.
- Keep card radius at 8px or less.
- Avoid one-note palettes and avoid decorative gradient/orb backgrounds.
- Do not add visible instructional copy that explains obvious UI behavior.

Backend facts to respect:
- API base URL is `/api/v1`.
- Auth returns `{ access_token, token_type, user }`.
- Protected calls require `Authorization: Bearer <token>`.
- Current mounted routes include health, auth, users, submissions, problems, and leaderboard.
- Current problem routes are mounted under `/api/v1/problems`.
- Current tags route is `/api/v1/problems/tags`, while docs also describe canonical `GET /api/v1/tags`.
- Current admin problem actions are under `/api/v1/problems`, while docs describe canonical `/api/v1/admin/*`.
- Client adapters must normalize backend response shapes and handle documented/current mismatches.
- Run means `POST /submissions` with `run_samples_only: true`.
- Submit means `POST /submissions` with `run_samples_only: false`.
- Poll submissions until status is no longer `PENDING` or `RUNNING`.
- On `ACCEPTED`, continue polling for `score > 0` until timeout.
- `SAMPLE_PASSED` never marks a problem solved.
- Treat HTTP 429 as rate limit even if the error body code is inconsistent.

Phase rules:
- Implement only the requested phase and its direct prerequisites.
- Do not edit backend code unless the user explicitly asks or the phase is blocked by a backend bug and the user approves fixing it.
- Keep modules feature-based and shared components generic.
- Add or update tests proportional to the phase risk.
- Start the dev server for frontend phases and verify the route in the in-app browser after meaningful UI changes.
- Before finishing, run the phase verification checklist and summarize what passed, what was not run, and any backend dependency still open.

Output expected:
- Implemented frontend files for the current phase.
- Clear final summary with changed areas, verification commands, local URL if a server is running, and remaining blockers.
```

## Confirmation Defaults

If no further confirmation is given, use these defaults:

- Vite template: `react-ts`.
- Styling: Tailwind CSS with local design tokens in CSS variables.
- API client: native `fetch`, not Axios.
- Forms: controlled React forms first; add a form library only if admin forms become too heavy.
- Charts/heatmaps: implement lightweight reusable SVG/CSS components first; add a chart library only when a chart needs advanced interactions.
- Tests: Vitest + React Testing Library for units, Playwright for browser flows.
