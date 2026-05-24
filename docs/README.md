# XYZ Platform — Documentation Index

All planning documents for **xyz_plateform**. This repo is **standalone** (not linked to todo-list or other projects).

## Requirements & decisions

| Document | Description |
|----------|-------------|
| [requirements.md](./requirements.md) | Product & technical requirements (v1) |
| [comparison/mern-vs-fastapi.md](./comparison/mern-vs-fastapi.md) | Why FastAPI + Postgres over MERN for this project |

## Analysis

| Document | Description |
|----------|-------------|
| [analysis/plan-readiness-review.md](./analysis/plan-readiness-review.md) | Pre-build plan review (gaps, phase readiness) |
| [analysis/plan-fixes-applied.md](./analysis/plan-fixes-applied.md) | Fixes applied to the plan before implementation |

## UML diagrams (class & state)

| Document | Description |
|----------|-------------|
| [diagrams/uml-specification.md](./diagrams/uml-specification.md) | **Domain class diagram**, application layer, submission/worker/auth **state diagrams**, ER diagram |

## Backend implementation (phases)

| Document | Description |
|----------|-------------|
| [backend/README.md](./backend/README.md) | **Start here** — phase index, build order, resolved decisions |

### Reference (not build sprints)

| File | Purpose |
|------|---------|
| [backend/00-overview.md](./backend/00-overview.md) | Goals, stack, enums |
| [backend/01-database-models.md](./backend/01-database-models.md) | Schema reference |
| [backend/07-api-routes.md](./backend/07-api-routes.md) | REST API contract |
| [backend/08-controllers-services.md](./backend/08-controllers-services.md) | Layer map |
| [backend/09-env-security.md](./backend/09-env-security.md) | Env, Docker, security |
| [backend/10-frontend-ui-map.md](./backend/10-frontend-ui-map.md) | UI → API map |
| [backend/12-seed-problems-spec.md](./backend/12-seed-problems-spec.md) | Seed data (5 problems) |
| [backend/13-plan-verification.md](./backend/13-plan-verification.md) | 40-point completeness checklist |

### Implementation phases (build in order)

| Phase | File |
|-------|------|
| 1 | [backend/02-phase-1-setup.md](./backend/02-phase-1-setup.md) |
| 2 | [backend/03-phase-2-auth.md](./backend/03-phase-2-auth.md) |
| 3 | [backend/04-phase-3-problems.md](./backend/04-phase-3-problems.md) |
| 4 | [backend/05-phase-4-judge.md](./backend/05-phase-4-judge.md) |
| 5 | [backend/06-phase-5-scoring.md](./backend/06-phase-5-scoring.md) |
| 6 | [backend/11-phase-6-frontend.md](./backend/11-phase-6-frontend.md) |

## Build order

```text
Requirements → Backend Phases 1–5 → Frontend Phase 6
Seed after Phase 3: scripts/seed_problems.py
```
