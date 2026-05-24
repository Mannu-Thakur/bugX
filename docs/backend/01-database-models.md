# 01 — Database Models

Reference schema. Create tables via Alembic migrations in implementation Phases 2–4 (see [README.md](./README.md)).

**UML:** Domain class diagram, ER diagram, and submission state machine — [../diagrams/uml-specification.md](../diagrams/uml-specification.md).

## ER (text)

```
users 1──* submissions *──1 problems
problems 1──* test_cases
problems *──* tags (problem_tags)
submissions 1──* submission_results (per test case)
users 1──1 user_stats
problems 1──* problem_templates (starter code per lang)
```

---

## `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | indexed |
| username | VARCHAR(50) UNIQUE | indexed |
| password_hash | VARCHAR(255) | bcrypt |
| role | ENUM | USER, ADMIN default USER |
| avatar_url | VARCHAR(512) NULL | |
| is_active | BOOL | default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## `user_stats`

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID PK FK→users | |
| total_solved | INT | default 0 — first AC per problem only |
| easy_solved | INT | |
| medium_solved | INT | |
| hard_solved | INT | |
| total_score | INT | default 0 — sum of best score per solved problem |
| current_streak | INT | |
| best_streak | INT | |
| last_active_date | DATE NULL | UTC date |

---

## `problems`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| slug | VARCHAR(100) UNIQUE | e.g. two-sum |
| title | VARCHAR(200) | |
| description | TEXT | markdown |
| difficulty | ENUM | EASY, MEDIUM, HARD |
| time_limit_ms | INT | default 2000 |
| memory_limit_kb | INT | default 262144 |
| score_base | INT | default 100 |
| runtime_bonus_max | INT | default 20 |
| expected_complexity | VARCHAR(20) NULL | display only e.g. O(n) |
| is_published | BOOL | default false |
| acceptance_rate | FLOAT NULL | cached % — see Phase 5 formula |
| created_at | TIMESTAMPTZ | |

---

## `problem_templates`

Starter code per language. Drives `code_wrapper_service`.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| problem_id | UUID FK | |
| language | VARCHAR(20) | v1: `python`, `javascript` only |
| template_code | TEXT | |
| function_name | VARCHAR(100) | for wrapper injection |
| arg_style | ENUM | `kwargs` \| `positional` \| `single` — how stdin JSON maps to args |

UNIQUE(problem_id, language)

---

## `test_cases`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| problem_id | UUID FK | indexed |
| input | TEXT | JSON string |
| expected_output | TEXT | JSON string |
| is_sample | BOOL | shown to user |
| order_index | INT | |
| weight | INT | default 1 — used in scoring denominator |

---

## `tags` + `problem_tags`

**tags:** id, name UNIQUE  
**problem_tags:** problem_id, tag_id — composite PK

---

## `submissions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | indexed |
| problem_id | UUID FK | indexed |
| language | VARCHAR(20) | |
| source_code | TEXT | |
| status | ENUM | submission_status — includes `SAMPLE_PASSED` for sample-only runs |
| passed_count | INT | default 0 — count of passed tests (display) |
| total_count | INT | default 0 |
| passed_weight | INT | default 0 — sum of weight for passed tests |
| total_weight | INT | default 0 — sum of weight for tests run |
| score | INT | 0–score_base+bonus; set in Phase 5 |
| runtime_ms | INT NULL | max across tests |
| memory_kb | INT NULL | |
| error_message | TEXT NULL | |
| run_samples_only | BOOL | default false |
| created_at | TIMESTAMPTZ | indexed |
| updated_at | TIMESTAMPTZ | set on status changes (worker reclaim uses stale `RUNNING`) |

INDEX(user_id, problem_id, created_at DESC)

**Qualifying submission (v1):** `status = 'ACCEPTED' AND run_samples_only = false`. Used for solved, bests, stats, leaderboards, acceptance rate, first AC.

**First AC detection (app logic, not a column):**

```sql
SELECT EXISTS (
  SELECT 1 FROM submissions
  WHERE user_id = :uid AND problem_id = :pid
    AND status = 'ACCEPTED'
    AND run_samples_only = false
    AND id <> :current_id
) AS had_prior_ac;
```

`had_prior_ac = false` → this submission is first qualifying AC for user+problem.

**`user_status` queries (authenticated problem detail):**

```sql
-- solved
SELECT EXISTS (
  SELECT 1 FROM submissions
  WHERE user_id = :uid AND problem_id = :pid
    AND status = 'ACCEPTED' AND run_samples_only = false
);

-- best_score (API: null if no qualifying row OR max is 0 — scoring pending)
SELECT MAX(score) FROM submissions
WHERE user_id = :uid AND problem_id = :pid
  AND status = 'ACCEPTED' AND run_samples_only = false;
-- ProblemService: return MAX only if > 0, else null (see README / Phase 3)
```

---

## `submission_results`

Per test case result (hidden details omitted in API for non-sample).

| Column | Type |
|--------|------|
| id | UUID PK |
| submission_id | UUID FK |
| test_case_id | UUID FK |
| passed | BOOL |
| stdout | TEXT NULL |
| stderr | TEXT NULL |
| runtime_ms | INT |
| memory_kb | INT |

**Constraint:** `UNIQUE(submission_id, test_case_id)` — one row per test per submission. `judge_service.run` deletes all rows for the submission before re-inserting (reclaim/retry safe). See [05-phase-4-judge.md](./05-phase-4-judge.md#judge_servicerun-idempotency).

---

## `refresh_tokens` (v2 only)

Not in v1 migrations. Planned for refresh-token auth in a later release.

---

## Alembic

- One migration per implementation phase merge (Phases 2–4)
- Seed script: `scripts/seed_problems.py` — idempotent **ADMIN** from `SEED_ADMIN_*` env + **5** problems per [12-seed-problems-spec.md](./12-seed-problems-spec.md); calls services/repos **directly** (no HTTP)
- **Runtime:** `DATABASE_URL=postgresql+asyncpg://…` (FastAPI + worker)
- **Migrations:** `ALEMBIC_DATABASE_URL=postgresql+psycopg2://…` in `alembic/env.py` (sync driver; do not use asyncpg in Alembic)

### Phase 4: `submission_status` enum

Create the enum in the **Phase 4** migration with all v1 values upfront (do not add `SAMPLE_PASSED` in a later ALTER if avoidable):

`PENDING`, `RUNNING`, `ACCEPTED`, `SAMPLE_PASSED`, `WRONG_ANSWER`, `TIME_LIMIT`, `RUNTIME_ERROR`, `COMPILE_ERROR`, `MEMORY_LIMIT`

**SQLAlchemy / Alembic:** use `sa.Enum(..., name='submission_status')` on first create. If you must ALTER later: `ALTER TYPE submission_status ADD VALUE 'SAMPLE_PASSED';` (Postgres 9.1+).

### `submissions.updated_at`

ORM `onupdate=utcnow` **plus** explicit sets in `SubmissionRepo.set_status` whenever status changes (`PENDING`→`RUNNING`→terminal). Worker reclaim queries `updated_at < now() - interval '10 minutes'`.

## Indexes summary

```sql
CREATE INDEX idx_submissions_user_problem ON submissions(user_id, problem_id);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);
CREATE INDEX idx_submissions_problem_status ON submissions(problem_id, status);
CREATE INDEX idx_submissions_qualifying ON submissions(user_id, problem_id)
  WHERE status = 'ACCEPTED' AND run_samples_only = false;
CREATE INDEX idx_problems_difficulty ON problems(difficulty) WHERE is_published;
CREATE INDEX idx_test_cases_problem ON test_cases(problem_id);
CREATE UNIQUE INDEX uq_submission_results_submission_test
  ON submission_results(submission_id, test_case_id);
```
