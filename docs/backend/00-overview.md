# 00 — Overview

## Goal

Users code in browser → submit → sandbox runs tests → score on **full pass only** (all weighted tests) + runtime bonus (v1: no partial credit).

## Why this stack

| Choice | Reason |
|--------|--------|
| FastAPI | Async, OpenAPI auto-docs, fast dev |
| PostgreSQL | Relational: users, problems, submissions |
| Redis | Job queue + rate limit + session cache |
| Judge0 | Battle-tested sandbox; no custom runner v1 |
| SQLAlchemy 2 + Alembic | Migrations, type-safe models |

## Non-goals (v1)

- Real Big-O proof → use runtime tiers instead
- Custom plagiarism / AI proctoring
- Live collaboration
- Refresh tokens (JWT access only; see README resolved decisions)
- C++ / additional languages (python + javascript only)
- Partial credit on failed full submits (`score` is 0 unless qualifying `ACCEPTED`)

## Layer rules

```
Router → Controller → Service → Repository → DB
                ↓
            Judge0 / Redis
```

**UML:** Application layer class diagram and state machines — [../diagrams/uml-specification.md](../diagrams/uml-specification.md).

- **Router:** parse HTTP, auth deps, call controller, return schema
- **Controller:** one use-case per method; no SQL
- **Service:** business rules, scoring, queue publish
- **Repository:** CRUD only

## Public API surface (v1)

- Auth, users, problems, tags (`GET /tags`), submissions, leaderboard, admin — full contract in [07-api-routes.md](./07-api-routes.md)
- Pagination, validation, and admin request bodies are defined there (not duplicated in phase docs)

## Naming

- Routes: `/api/v1/...`
- IDs: UUID v4
- Timestamps: UTC `datetime`
- Slugs: problems use `slug` (unique, URL-safe)

## Status enums (shared)

```python
# submission_status
PENDING | RUNNING | ACCEPTED | SAMPLE_PASSED | WRONG_ANSWER | TIME_LIMIT | RUNTIME_ERROR | COMPILE_ERROR | MEMORY_LIMIT
# ACCEPTED = full submit, all tests passed. SAMPLE_PASSED = run_samples_only, all samples passed (not qualifying).

# difficulty
EASY | MEDIUM | HARD

# role
USER | ADMIN

# arg_style (problem_templates)
kwargs | positional | single
```

## Implementation timeline (solo dev)

Uses **implementation phases** from [README.md](./README.md) — not the `01-database-models` doc number.

| Week | Implementation phases | Notes |
|------|----------------------|-------|
| 1 | 1–2 | Setup + auth |
| 2 | 3 + seed | Problems catalog; seed **5** problems |
| 3 | 4–5 | Judge + scoring + polish |
| 4 | 6 | Frontend SPA (requires backend 1–5 running locally) |
