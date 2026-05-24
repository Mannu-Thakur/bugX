# XYZ Platform

LeetCode-inspired coding judge platform — **standalone project** (not related to other repos in this workspace).

## Stack

| Layer | Technology |
|-------|------------|
| Backend API | FastAPI (Python) |
| Database | PostgreSQL |
| Queue / cache | Redis |
| Code execution | Judge0 (Docker) |
| Frontend (Phase 6) | React 18 + Vite + Tailwind + Monaco |

## Documentation

All planning, requirements, and implementation phases live under:

**[docs/backend/README.md](./docs/backend/README.md)**

| Doc | Purpose |
|-----|---------|
| [00-overview.md](./docs/backend/00-overview.md) | Goals, stack, conventions |
| [01-database-models.md](./docs/backend/01-database-models.md) | Schema reference |
| [02-phase-1-setup.md](./docs/backend/02-phase-1-setup.md) … [06-phase-5-scoring.md](./docs/backend/06-phase-5-scoring.md) | Backend build phases |
| [07-api-routes.md](./docs/backend/07-api-routes.md) | REST API contract |
| [11-phase-6-frontend.md](./docs/backend/11-phase-6-frontend.md) | Frontend checklist |
| [12-seed-problems-spec.md](./docs/backend/12-seed-problems-spec.md) | Seed data (5 problems) |
| [13-plan-verification.md](./docs/backend/13-plan-verification.md) | Plan completeness checklist |

## Repo layout (planned)

```
xyz_plateform/
├── docs/backend/          # ← current: full implementation plan
├── backend/               # Phase 1+: FastAPI app (not scaffolded yet)
├── frontend/              # Phase 6: React SPA
└── README.md
```

## Build order

```text
Backend Phases 1 → 2 → 3 → seed → 4 → 5 → Frontend Phase 6
```

See [docs/backend/README.md](./docs/backend/README.md) for details.

## Repository

https://github.com/Mannu-Thakur/xyz_plateform
