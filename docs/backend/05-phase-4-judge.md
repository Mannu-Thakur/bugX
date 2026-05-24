# Implementation Phase 4 — Judge & Submissions

**Goal:** Submit code → queue → Judge0 → store results → terminal status. **Does not** update `user_stats`, leaderboard, or `submission.score` (Phase 5).

## Flow

```
POST /submissions { problem_id, language, source_code, run_samples_only? }
  → validate + rate limit (submit/min/user)
  → create row (PENDING, run_samples_only)
  → Redis LPUSH submission_queue (JSON payload — see below)
  → return 202 { id, status: PENDING }

Worker:
  → BRPOP submission_queue (timeout e.g. 5s)
  → parse payload → submission_id (UUID)
  → skip unless status == PENDING (duplicate delivery or already RUNNING)
  → status = RUNNING, updated_at = now(UTC)
  → judge_service.run: delete prior submission_results for this id (idempotent retry/reclaim)
  → load test_cases (samples only if run_samples_only else all, ordered by order_index)
  → wrap code (code_wrapper_service + template arg_style)
  → for each test: Judge0 with stdin + compare stdout to expected (output_compare_service)
  → aggregate passed_count, passed_weight, total_weight, max runtime/memory
  → set terminal status (see below — Run vs Submit)
  → insert submission_results
  → (Phase 5 only) scoring_service.on_submission_complete()
```

## `run_samples_only`

| Flag | Tests run | Terminal status if all run tests pass |
|------|-----------|----------------------------------------|
| `true` (**Run**) | `is_sample=true` only | **`SAMPLE_PASSED`** — never `ACCEPTED` |
| `false` (**Submit**) | all tests (ordered by `order_index`) | **`ACCEPTED`** (qualifying) |

- Failures still map to `WRONG_ANSWER`, `TIME_LIMIT`, etc. (same Judge0 rules)
- Phase 5 scoring/stats run only when `run_samples_only=false` and judge finished
- Both Run and Submit use `POST /submissions` and count toward **10 submits/min/user**
- Validate `language` ∈ `{ python, javascript }` only (v1)

## `POST /submissions` validation (`SubmissionService.create`)

Before enqueue:

1. `problem_id` exists and `is_published = true` → else **404**
2. `language` ∈ `{ python, javascript }` → else **422**
3. `source_code` length ≤ `MAX_SOURCE_BYTES` (64 KB) → else **422**
4. `problem_templates` row exists for `(problem_id, language)` → else **422** (no wrapper)
5. Authenticated user (`get_current_active_user`) → else **401** / **403** if inactive
6. `RateLimitService.check_submit(user_id)` → else **429**

Owner-only reads: `GET /submissions/{id}` and `/results` return **404** (not 403) if `submission.user_id ≠ current user` — v1 has no admin override route for others’ code (see [09-env-security.md](./09-env-security.md)).

## Judge test loop (v1)

- Run **every** test in scope (samples or all), **sequentially** — no early exit on first `COMPILE_ERROR` or `WRONG_ANSWER`
- Persist one `submission_results` row per test attempted
- After the loop, set submission terminal `status` using the priority rule below (worst outcome wins)

## Redis submission queue

| Item | Value |
|------|--------|
| Key | `submission_queue` (Redis LIST) |
| Enqueue | `LPUSH submission_queue '{"submission_id":"<uuid>"}'` |
| Dequeue | `BRPOP submission_queue 5` → parse JSON, load `submission_id` as UUID |

Use the same key name in `SubmissionService.enqueue` and `submission_worker`. Payload is a **JSON string** (not raw UUID bytes).

## Worker failure & stuck `RUNNING`

**On worker process start** (before main loop):

1. Reclaim stale rows: `status = RUNNING` **and** `updated_at < now() - 10 minutes` (UTC)
2. **Dev only** (`ENV=development`): optional config `RECLAIM_ALL_RUNNING_ON_START=true` to reset **all** `RUNNING` rows (faster local recovery; never enable in prod)
3. For each reclaimed row: set `status = PENDING`, reset judge counters on the row (`passed_count`, `passed_weight`, `total_count`, `total_weight`, `runtime_ms`, `memory_kb`, `error_message` → defaults/null), re-`LPUSH` queue payload `{"submission_id": "..."}`
4. Log reclaimed count

Do **not** delete `submission_results` in reclaim — `judge_service.run` deletes them at the start of every run (covers reclaim and duplicate queue delivery).

**Per job** — before judge:

1. Load submission; if `status != PENDING` → **return** (terminal row or already `RUNNING` on another pass — idempotent duplicate queue delivery)
2. Atomically set `RUNNING` and **`updated_at = now(UTC)`** via `SubmissionRepo.set_status` (use `UPDATE … WHERE status = PENDING` to avoid races if multi-worker in v2)

Wrap `judge_service.run` in try/except:

- On unhandled exception: set `RUNTIME_ERROR`, `error_message` truncated, `updated_at` touched, commit (never leave `RUNNING`)
- v1: no automatic retry queue

Every terminal status write must update **`updated_at`** (required for stale reclaim).

## `judge_service.run` idempotency

At the **start** of every run (before the test loop):

1. `SubmissionResultRepo.delete_by_submission_id(submission.id)` — removes partial rows from crashed or reclaimed jobs
2. Reset submission judge fields: `passed_count=0`, `passed_weight=0`, `total_count=0`, `total_weight=0`, `runtime_ms=null`, `memory_kb=null`, `error_message=null` (status stays `RUNNING` until terminal write)

DB enforces `UNIQUE(submission_id, test_case_id)` on `submission_results` — see [01-database-models.md](./01-database-models.md#submission_results).

After the loop: set terminal `status`, counts, weights, `updated_at`, then bulk-insert fresh `submission_results`.

**Phase 5:** after judge succeeds, **re-fetch** submission row from DB before scoring (judge persists status/weights in DB).

**v1 ops:** Run **one** worker replica — see [09-env-security.md](./09-env-security.md#submission-worker-v1).

## Files

| Layer | Files |
|-------|-------|
| models | `submission.py`, `submission_result.py` |
| schemas | `submission.py` |
| repositories | `submission_repo.py`, `submission_result_repo.py` |
| services | `judge_service.py`, `code_wrapper_service.py`, `judge0_client.py`, `output_compare_service.py` |
| controllers | `submission_controller.py` |
| routers | `submissions.py` |
| workers | `submission_worker.py` |

## Judge0 client

```python
async def execute(language_id, source_code, stdin, time_limit_ms, memory_limit_kb) -> {
  stdout, stderr, status_id, time, memory
}
```

Pass `expected_output` to Judge0 only when using compare API; otherwise compare in `output_compare_service` after run (recommended: compare in app for JSON normalization).

Language map (config) — **v1 only:**

| lang | judge0_id |
|------|-----------|
| python | 71 |
| javascript | 63 |

## `code_wrapper_service`

Read `function_name` + `arg_style` from `problem_templates` for the submission language. Stdin is always one JSON value per test `input` column.

**Python (`kwargs`)** — stdin = JSON object, keys = parameter names:

```python
import json, sys
{user_code}
if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = {function_name}(**data)
    print(json.dumps(result))
```

**Python (`single`)** — stdin = any single JSON value (scalar, array, object):

```python
    data = json.loads(sys.stdin.read())
    result = {function_name}(data)
    print(json.dumps(result))
```

**Python (`positional`)** — stdin = JSON array, one element per parameter in order:

```python
    args = json.loads(sys.stdin.read())
    result = {function_name}(*args)
    print(json.dumps(result))
```

**JavaScript (`single`):**

```javascript
{user_code}
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
const result = {function_name}(data);
console.log(JSON.stringify(result));
```

**JavaScript (`positional`):**

```javascript
{user_code}
const fs = require('fs');
const args = JSON.parse(fs.readFileSync(0, 'utf8'));
const result = {function_name}(...args);
console.log(JSON.stringify(result));
```

**v1 seed rule:** Python may use `kwargs` when stdin is a JSON object. JavaScript templates use **`single`** or **`positional`** only (no `kwargs` in v1 — object key order is not reliable for `Object.values`).

**Admin guard:** `javascript` + `kwargs` is rejected at create time ([07-api-routes.md](./07-api-routes.md#problemcreate)). `CodeWrapperService` should raise `ValueError` if `kwargs` is requested for javascript (defense in depth).

## `output_compare_service`

1. Strip trailing whitespace on stdout
2. `json.loads` stdout and expected; if both succeed → deep equality with float tolerance `1e-5`
3. If parse fails → string equality after strip
4. Arrays: order-sensitive unless problem description says otherwise (v1: order-sensitive)

## Status mapping (Judge0 → app)

Per-test Judge0 outcome:

| judge0 status / id | app status (per test) |
|--------------------|------------------------|
| Accepted | compare stdout → pass/fail |
| Time Limit Exceeded | TIME_LIMIT |
| Runtime Error (SIGSEGV, etc.) | RUNTIME_ERROR |
| Compilation Error | COMPILE_ERROR |
| Memory Limit Exceeded | MEMORY_LIMIT |
| Internal Error / Other | RUNTIME_ERROR + log |

**Submission terminal status** (after **all** tests in scope have run):

1. If any test → `COMPILE_ERROR` | `RUNTIME_ERROR` | `TIME_LIMIT` | `MEMORY_LIMIT` → use that status (priority: compile > runtime > TLE > MLE > WA). Early exit is **not** used in v1.
2. Else if any comparison fails → `WRONG_ANSWER`.
3. Else all tests passed:
   - `run_samples_only=true` → **`SAMPLE_PASSED`**
   - `run_samples_only=false` → **`ACCEPTED`** (qualifying)

Never assign `ACCEPTED` when `run_samples_only=true`.

## Sync poll endpoint (MVP)

`GET /submissions/{id}` — client polls every 1–2s until status not in `PENDING`, `RUNNING`.

`GET /submissions/{id}/results` — per-test rows; **only sample tests** include `input` / `expected_output` in response.

Optional v2: WebSocket `/ws/submissions/{id}`.

## Limits

- Max source: 64 KB
- Rate: 10 **POST /submissions** / user / minute — Run and Submit both (`RateLimitService.check_submit`)
- Timeout: `problem.time_limit_ms + 500` ms buffer per Judge0 call
- Languages: reject unsupported `language` with 422

## Worker (required)

> **Phase boundary:** This phase’s worker ends after `judge_service.run()`. Do **not** import or call `ScoringService` until Phase 5. The full worker (judge + scoring) is in [08-controllers-services.md](./08-controllers-services.md) under **Phase 5+**.

Submissions stay `PENDING` until a consumer runs. **Dev (pick one):**

```bash
# Terminal 2 (alongside uvicorn)
python -m app.workers.submission_worker
```

**Docker (Phase 4+):** add `worker` service — see [09-env-security.md](./09-env-security.md#submission-worker-v1). `BackgroundTasks` inside uvicorn is **dev-only** fallback; do not rely on it in prod.

## Health (Phase 4 extension)

Extend `GET /api/v1/health` to include `judge0`: `"ok"` \| `"error"` (HTTP probe to `JUDGE0_URL`, e.g. `/about`). Phases 1–3 omit this field or return `"skipped"` when `JUDGE0_URL` is unset. See [07-api-routes.md](./07-api-routes.md#health).

## docker-compose

Extend **`backend/docker-compose.yml`** with Judge0 stack + `api` + `worker` from [09-env-security.md](./09-env-security.md). Set `JUDGE0_URL=http://judge0:2358` for API and worker containers. Run `docker compose` from `backend/`.

## Judge0 CE (v1 expectations)

| Topic | Guidance |
|-------|----------|
| Concurrency | One Judge0 request per test sequentially in v1; CE may queue under load — expect slower runs, not wrong caps |
| Timeouts | Use `problem.time_limit_ms + 500` per call; map Judge0 TLE to `TIME_LIMIT` |
| Unavailable | If Judge0 HTTP fails → submission `RUNTIME_ERROR`, `error_message = "Judge unavailable"`; log for ops |
| Language IDs | Python **71**, JavaScript **63** (Node); verify against `GET {JUDGE0_URL}/languages` after compose up |
| Resources | Judge0 CE needs ~2 GB RAM for compose stack; document in README for contributors |

**First-time bring-up checklist:** [09-env-security.md](./09-env-security.md#judge0-first-time-bring-up-phase-4)

## Done when

- Full submit passes all tests → `ACCEPTED` (score still 0 until Phase 5)
- Run passes all samples → `SAMPLE_PASSED` (never `ACCEPTED`; `user_status.solved` unchanged)
- Wrong answer → `WRONG_ANSWER` + sample failure in `/results`
- TLE → `TIME_LIMIT`
- Worker process running; queue drains `PENDING` → terminal
- Stale `RUNNING` rows reclaimed on worker restart
- Queue uses JSON `{"submission_id": "..."}` payloads
- Worker does **not** import `ScoringService` until Phase 5
- Reclaimed / retried jobs do not duplicate `submission_results` (`delete_by_submission_id` at judge start)
- `GET /api/v1/health` includes `judge0` when `JUDGE0_URL` is set
- Unpublished / missing `problem_id` on submit → 404; oversized code / bad language → 422
- Non-owner `GET /submissions/{id}` → 404

## Migration

- `submissions`, `submission_results` (include `passed_weight`, `total_weight`, `run_samples_only`, `updated_at`)
- `UNIQUE(submission_id, test_case_id)` on `submission_results`
- `submission_status` enum with **`SAMPLE_PASSED`** on first create — see [01-database-models.md](./01-database-models.md#phase-4-submission_status-enum)

## Tests

- `tests/test_submissions.py` — create 202; validation 404/422; owner 404
- `tests/test_output_compare.py` — JSON equality + float tolerance
- `tests/test_code_wrapper.py` — positional/single wrappers per language
- `tests/integration/test_judge_flow.py` — docker-compose: submit → worker → ACCEPTED (optional CI)
