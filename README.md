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

**Full index:** [docs/README.md](./docs/README.md)

| Category | Path |
|----------|------|
| **Requirements** | [docs/requirements.md](./docs/requirements.md) |
| **Stack comparison** (MERN vs FastAPI) | [docs/comparison/mern-vs-fastapi.md](./docs/comparison/mern-vs-fastapi.md) |
| **Plan analysis** | [docs/analysis/plan-readiness-review.md](./docs/analysis/plan-readiness-review.md) |
| **Plan fixes log** | [docs/analysis/plan-fixes-applied.md](./docs/analysis/plan-fixes-applied.md) |
| **UML (class & state diagrams)** | [docs/diagrams/uml-specification.md](./docs/diagrams/uml-specification.md) |
| **Backend phases** | [docs/backend/README.md](./docs/backend/README.md) |

### Phase & reference docs (15 files in `docs/backend/`)

| Doc | Purpose |
|-----|---------|
| [00-overview.md](./docs/backend/00-overview.md) | Goals, stack, conventions |
| [01-database-models.md](./docs/backend/01-database-models.md) | Schema reference |
| [02-phase-1-setup.md](./docs/backend/02-phase-1-setup.md) … [06-phase-5-scoring.md](./docs/backend/06-phase-5-scoring.md) | Backend build phases |
| [07-api-routes.md](./docs/backend/07-api-routes.md) | REST API contract |
| [11-phase-6-frontend.md](./docs/backend/11-phase-6-frontend.md) | Frontend checklist |
| [12-seed-problems-spec.md](./docs/backend/12-seed-problems-spec.md) | Seed data (5 problems) |
| [13-plan-verification.md](./docs/backend/13-plan-verification.md) | Plan completeness checklist (44/44) |

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
