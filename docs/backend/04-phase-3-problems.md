# Implementation Phase 3 — Problems Catalog

**Goal:** CRUD problems (admin), public list/detail, tags API, sample test cases visible, starter templates.

## Endpoints

Problems + Tags + Admin — see [07-api-routes.md](./07-api-routes.md).

| Method | Path | Auth |
|--------|------|------|
| GET | `/tags` | Public |
| GET | `/problems` | Public |
| GET | `/problems/{slug}` | Optional (`get_optional_user`) |
| POST | `/admin/problems` | ADMIN |
| PUT | `/admin/problems/{id}` | ADMIN |
| DELETE | `/admin/problems/{id}` | ADMIN (unpublish) |
| POST | `/admin/problems/{id}/test-cases` | ADMIN |
| POST | `/admin/tags` | ADMIN |

## Files

| Layer | Files |
|-------|-------|
| models | `problem.py`, `test_case.py`, `tag.py`, `problem_template.py` |
| schemas | `problem.py`, `test_case.py`, `tag.py` — shapes in [07-api-routes.md](./07-api-routes.md#problemcreate) |
| repositories | `problem_repo.py`, `test_case_repo.py`, `tag_repo.py` |
| services | `problem_service.py`, `tag_service.py` |
| controllers | `problem_controller.py`, `tag_controller.py`, `admin_problem_controller.py` |
| routers | `problems.py`, `tags.py`, `admin.py` |

## Router mount

```python
app.include_router(tags_router, prefix="/api/v1", tags=["tags"])
app.include_router(problems_router, prefix="/api/v1", tags=["problems"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
```

## Public vs admin

| Action | Auth |
|--------|------|
| List tags | Public |
| List/filter problems | Public |
| Get problem by slug | Public — **only sample test cases**; optional auth for `user_status` |
| Create/update problem | ADMIN |
| Delete problem | ADMIN — **unpublish** (`is_published=false`) only |
| Bulk import test cases | ADMIN |

## `GET /tags`

`TagController.list_tags` → `TagRepo.list_names()` → `{ "items": ["array", "hash-map", ...] }` sorted ASC.

## List filters (`ProblemRepo.list_filtered`)

| Param | Behavior |
|-------|----------|
| `difficulty` | Exact `EASY` \| `MEDIUM` \| `HARD` |
| `tag` | Inner join `problem_tags` + `tags` where `tags.name = :tag` (**case-sensitive**, exact) |
| `search` | `ILIKE %search%` on `title` |
| `page`, `limit` | [07-api-routes.md](./07-api-routes.md#pagination) |
| `sort` | `title` (default) or `acceptance` |

Only `is_published=true`. Unknown `tag` → empty `items`, not 404.

## `problem_service.get_by_slug(slug, user?)`

`user` from `get_optional_user`: `None` → always `_default_user_status()`.

Return shape:

```json
{
  "id", "slug", "title", "description", "difficulty",
  "time_limit_ms", "memory_limit_kb", "score_base", "runtime_bonus_max",
  "acceptance_rate",
  "tags": ["array", "hash-map"],
  "templates": { "python": "...", "javascript": "..." },
  "sample_tests": [{ "input", "expected_output" }],
  "user_status": { "solved": false, "best_score": null }
}
```

- Never expose hidden test `input/output` in public API

### `user_status` by implementation phase

| Phase | When `user` is authenticated | When anonymous |
|-------|------------------------------|----------------|
| **3** | `_default_user_status()` — do **not** query `submissions` | `_default_user_status()` |
| **4+** | Live qualifying queries (below) | `_default_user_status()` |

**Phase 4+ rules** (qualifying = `status = ACCEPTED` AND `run_samples_only = false`):

- `solved`: `SubmissionRepo.exists_qualifying_ac(user_id, problem_id)`
- `best_score`: `MAX(score)` among qualifying rows; API returns **`null` if no rows or max is 0** (scoring pending)
- `SAMPLE_PASSED` never affects `user_status`
- `solved` may be **true** while `best_score` is **null** (AC recorded, scoring worker not finished)

```python
max_score = MAX(score) among qualifying rows  # None if no rows
best_score = max_score if (max_score is not None and max_score > 0) else None
```

## Admin create problem flow

Use `ProblemCreate` body from [07-api-routes.md](./07-api-routes.md#problemcreate):

**Template validation (`ProblemService` / admin controller):**

- Each `language` ∈ `{python, javascript}`
- `function_name` must match `^[A-Za-z_][A-Za-z0-9_]*$` before wrapper injection
- `template_code` must be non-empty and ≤ 64 KB
- If `language == "javascript"` and `arg_style == "kwargs"` → **422** `VALIDATION_ERROR` (v1 has no JS kwargs wrapper)
- If `language == "python"`, `arg_style` ∈ `{kwargs, positional, single}`
- `time_limit_ms` 100-15000, `memory_limit_kb` 16000-256000, `score_base >= 1`, `runtime_bonus_max >= 0`
- Each `test_cases.input` and `test_cases.expected_output` must parse as JSON; `order_index` must be unique per problem; `weight >= 1`

1. Insert problem
2. Insert templates (≥1 language) with `function_name` + `arg_style`
3. Insert test_cases (≥1 sample + ≥3 hidden)
4. Link tags via `tag_names` → `TagService.get_or_create`
5. Respect `is_published` from body (seed sets `true`)

## Seed `arg_style` (v1)

**Canonical per-problem values:** [12-seed-problems-spec.md](./12-seed-problems-spec.md) — do not invent ad hoc.

**Rule:** Each `test_cases.input` must parse correctly for **both** python and javascript templates on that problem. Prefer **`positional`** or **`single`** shared across both languages. Python-only `kwargs` is allowed when stdin is a JSON object **and** javascript on that problem does not use `kwargs` (v1 seed uses shared stdin shapes instead).

| stdin shape | Both languages `arg_style` |
|-------------|----------------------------|
| JSON array of ordered args `[a, b, ...]` | `positional` |
| Single JSON value (string, number, array, object) | `single` |
| JSON object keyed by param names | `kwargs` (python only) — **not used in v1 seed** |

## Seed data

`scripts/seed_problems.py` — **5** problems per [12-seed-problems-spec.md](./12-seed-problems-spec.md).

## Admin bootstrap (required before seed)

Public `POST /auth/register` always creates `role=USER`. First **ADMIN** only via seed script.

**`scripts/seed_problems.py` flow:**

1. If no user with `SEED_ADMIN_EMAIL` → insert `role=ADMIN` + `user_stats` (bcrypt `SEED_ADMIN_PASSWORD`)
2. Else reuse existing admin (do not reset password)
3. Upsert problems via **`ProblemService` / repos directly** — no HTTP, no JWT (CLI idempotency)
4. Print admin email + prod password rotation reminder

**Dev admin API access:** `POST /auth/login` with seed credentials → Bearer for `/admin/*` in Swagger.

## Done when

- `GET /tags` returns seeded tag names
- Public list paginates with `tag`, `difficulty`, `search`, `sort`
- Detail hides hidden tests; invalid Bearer on detail → 401
- Admin CRUD matches `ProblemCreate` / `ProblemUpdate` schemas
- Admin create rejects `javascript` + `kwargs` with **422**
- Admin create rejects invalid JSON tests, duplicate `order_index`, unsafe `function_name`, and zero/negative scoring fields
- Admin delete unpublishes only
- Seed idempotent (admin + 5 problems)
- Authenticated detail returns stub `user_status` in Phase 3 only

## Migration

- `problems`, `test_cases`, `tags`, `problem_tags`, `problem_templates`
- No `submissions` tables until Phase 4

## Tests

- `tests/test_problems.py` — list pagination; tag filter exact match; detail samples only; optional auth stub
- `tests/test_tags.py` — `GET /tags`
- `tests/test_admin_problems.py` — create with ADMIN token; non-admin 403; unpublish
