# Frontend Planning Docs

This directory is the frontend source of truth before implementation begins. It translates the backend implementation, backend phase docs, and product requirements into a phase-wise frontend build plan.

## Reading Order

| Doc | Purpose |
| --- | --- |
| [00-frontend-planning-prompt.md](./00-frontend-planning-prompt.md) | Refined prompt to use before implementing each frontend phase. |
| [01-backend-contract-analysis.md](./01-backend-contract-analysis.md) | Backend models, APIs, middleware, scoring, analytics, and current implementation gaps. |
| [02-frontend-architecture.md](./02-frontend-architecture.md) | Frontend stack, module boundaries, route map, state model, and folder structure. |
| [03-phase-wise-implementation-plan.md](./03-phase-wise-implementation-plan.md) | Independent implementation phases with deliverables and acceptance criteria. |
| [04-api-client-and-contract-plan.md](./04-api-client-and-contract-plan.md) | API client, normalized frontend types, query keys, polling, and error handling. |
| [05-ui-component-system-plan.md](./05-ui-component-system-plan.md) | Reusable UI components for tables, charts, heatmaps, forms, modals, and solve workspace. |
| [06-verification-and-qa-plan.md](./06-verification-and-qa-plan.md) | Per-phase checks, browser verification, test strategy, and release readiness. |

## Locked Product Direction

- LeetCode-style coding practice platform.
- React 18 + Vite + Tailwind CSS + React Router v6 + TanStack Query + Monaco.
- Browser SPA with auth, problem catalog, solve workspace, submissions, profile, leaderboard, and admin problem management.
- Reusable modular components: tables, charts, graphs, heatmaps, buttons, inputs, modals, badges, panels, and layout sections.
- Run uses sample tests only and returns `SAMPLE_PASSED` when successful.
- Submit uses all tests and returns `ACCEPTED` only for full passing submissions.
- Scoring is full-pass only; no partial credit in v1.

## Implementation Assumptions

- Use Vite React with TypeScript unless explicitly changed before Phase 1.
- Use the backend base URL `VITE_API_URL=http://localhost:8000/api/v1`.
- Keep server state in TanStack Query and local UI state near the feature that owns it.
- Store the JWT in localStorage for persistence and mirror it in memory through an auth provider.
- Keep API adapters resilient to the current backend shape and the documented target shape.

## Backend Alignment Note

The backend docs describe the canonical v1 contract. The current backend code now mounts a consolidated problems router under `/api/v1/problems`, which includes public problem routes, tag routes, best-submission lookup, and some admin problem actions. This differs from the docs in a few places:

- docs expect `GET /api/v1/tags`; current code exposes `GET /api/v1/problems/tags`,
- docs expect `/api/v1/admin/*`; current code exposes admin create/update/tag actions under `/api/v1/problems`,
- docs include admin unpublish/delete and test-case append routes; current code has publish/unpublish through `PATCH /api/v1/problems/{slug}` but no dedicated delete or append-test-cases route,
- response shapes still differ in a few places and should be normalized in the frontend API layer.

The frontend plan handles this by:

- defining the full target UX from the docs,
- calling out live-backend dependencies phase by phase,
- using typed adapters so frontend code can normalize response shape changes,
- allowing feature phases to be built against fixtures or mocks where backend actions are still missing.

## How To Use These Docs

Implement one phase at a time. At the start of each phase, read:

1. the phase section in [03-phase-wise-implementation-plan.md](./03-phase-wise-implementation-plan.md),
2. the API details in [04-api-client-and-contract-plan.md](./04-api-client-and-contract-plan.md),
3. any relevant reusable component entries in [05-ui-component-system-plan.md](./05-ui-component-system-plan.md),
4. the phase verification checks in [06-verification-and-qa-plan.md](./06-verification-and-qa-plan.md).

Each phase should compile, run, and be usable independently before moving to the next one.
