# Stack Comparison — MERN vs FastAPI (XYZ Platform)

Decision record for **xyz_plateform** backend technology.

## Summary

**Chosen for xyz_plateform:** FastAPI + PostgreSQL + Redis + Judge0 + React frontend.

**Not chosen:** MERN (MongoDB + Express + React + Node.js) for the coding-judge backend.

## Comparison

| Concern | FastAPI + PostgreSQL (chosen) | MERN |
|--------|-------------------------------|------|
| Data model | Users, problems, submissions, test cases, stats — natural fit for SQL + FKs | Doable in MongoDB; relations need extra discipline |
| Transactions | First AC, `FOR UPDATE`, score recompute — straightforward in Postgres | More manual consistency work |
| Background worker | Python worker + Judge0 is a common pattern | Node worker works; same Judge0 dependency |
| API contract | Pydantic models + auto OpenAPI/Swagger | Zod + manual or extra tooling |
| User code execution | Never on API server — Judge0 sandbox either way | Same — Express does not replace Judge0 |
| Existing plan | Full phased docs already written | Would require replanning |
| Portfolio | “Python API + React SPA” | “Full-stack JavaScript” |

## When MERN is a better fit

- Team wants **one language** (JavaScript) end-to-end
- App is mostly **CRUD** with flexible documents (blogs, simple dashboards)
- No heavy relational scoring, leaderboards, or judge workers

## When FastAPI is a better fit (this project)

- **Relational data** and correctness under concurrency
- **Queue + worker** for async judging
- **Clear API** for a separate React SPA
- **LeetCode-style** products with submissions, test cases, and stats

## Frontend note

XYZ Platform still uses **React** for the UI (Phase 6). Only the **API server** is Python/FastAPI — not a MERN backend.

## Related

- [../requirements.md](../requirements.md)
- [../backend/00-overview.md](../backend/00-overview.md)
