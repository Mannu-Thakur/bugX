# Implementation Phase 5 — Scoring, Stats, Leaderboard

**Goal:** Deterministic score, update `user_stats`, leaderboards, problem acceptance rate.

**Wire into worker:** after `judge_service.run()`, **re-fetch** submission from DB, then call `scoring_service.on_submission_complete(submission)` (judge already persisted counts, weights, status, results).

Skip scoring when `submission.run_samples_only == true` (leave `score=0`, do not touch stats).

## Score formula (v1 — full pass only)

No partial credit: score is **0** unless the submission is **qualifying** (`status = ACCEPTED` and `run_samples_only = false`), meaning all weighted tests passed.

```python
def calculate_score(
    status: str,
    passed_weight: int,
    total_weight: int,
    runtime_ms: int,
    time_limit_ms: int,
    score_base: int,
    bonus_max: int,
) -> int:
    if status != "ACCEPTED" or passed_weight < total_weight or total_weight == 0:
        return 0
    base = score_base
    ratio = min(runtime_ms / time_limit_ms, 1.0)
    bonus = int(bonus_max * (1 - ratio))
    return min(base + bonus, score_base + bonus_max)
```

| Case | Score |
|------|-------|
| Not qualifying (`WRONG_ANSWER`, `SAMPLE_PASSED`, etc.) | 0 |
| Qualifying full pass | `score_base` + runtime bonus (0–`bonus_max`) |

`runtime_ms` = max runtime across test runs for that submission.

## `scoring_service.on_submission_complete(submission)`

Only if `not submission.run_samples_only`:

1. Compute `score` via `calculate_score(...)` using judge-persisted `status`, weights, `runtime_ms`, and problem `score_base`, `runtime_bonus_max`
2. Persist submission `score` only (counts/weights/status already set by judge)
3. If qualifying (`status == ACCEPTED`):
   - Inside one DB transaction: `SELECT user_stats … FOR UPDATE` for `user_id`
   - **First AC:** `had_prior_ac` is false → increment `total_solved` + **difficulty counter** (see below)
   - **Best score:** recompute `user_stats.total_score` = sum of `MAX(score)` per problem over all qualifying submissions for this user (idempotent; do not only increment)
   - **Streak:** see below
4. `stats_service.update_acceptance_rate(problem_id)` — recompute from all full submits (`run_samples_only=false`), including `WRONG_ANSWER` (inside DB transaction, **outside** the `ACCEPTED` block)
5. **After commit:** `DEL leaderboard:all leaderboard:week` in Redis (step 5 is **not** inside the Postgres transaction)

Not on every submit: only first qualifying AC increments solve counts. Acceptance rate updates on **every** scored full submit (step 4), not only on AC.

```python
async def on_submission_complete(submission):
    score = calculate_score(...)
    async with db.begin():  # steps 2–4
        await submission_repo.set_score(submission.id, score)
        if submission.status == "ACCEPTED":
            async with user_stats_repo.lock_for_update(submission.user_id):
                # first AC, total_score recompute, streak — see below
                ...
        await stats_service.update_acceptance_rate(submission.problem_id)  # step 4 — all full submits
    await redis.delete("leaderboard:all", "leaderboard:week")  # step 5 — after commit
```

## Difficulty counter (first AC only)

Load `problems.difficulty` for `submission.problem_id`. Increment exactly one column on `user_stats`:

| `problem.difficulty` | Column to `+1` |
|----------------------|----------------|
| `EASY` | `easy_solved` |
| `MEDIUM` | `medium_solved` |
| `HARD` | `hard_solved` |

Also increment `total_solved` once per user+problem (same transaction as above).

## Concurrency

- **Postgres transaction:** steps 2–4 (`score` persist, `user_stats` + streak, `acceptance_rate`) in one `async with session.begin()`
- **Redis (step 5):** `DEL leaderboard:all leaderboard:week` only **after** the transaction commits successfully
- Lock `user_stats` with `SELECT … FOR UPDATE` before `had_prior_ac` + increments
- Recomputing `total_score` from DB avoids double-count if two submits race
- If Redis `DEL` fails after commit, log error; next cache miss rebuilds from DB (acceptable v1)

## `total_score` semantics

For each problem where user has ≥1 qualifying submission:

`best[problem] = MAX(score) WHERE status = ACCEPTED AND run_samples_only = false`

`user_stats.total_score = SUM(best[problem])` — full recompute on each qualifying scoring run.

## Acceptance rate

Counts **qualifying attempts** only (`run_samples_only = false`):

```python
ac = count(submissions where problem_id=X and status=ACCEPTED and run_samples_only=false)
total = count(submissions where problem_id=X and run_samples_only=false)
acceptance_rate = round(100.0 * ac / total, 2) if total else None
```

Update `problems.acceptance_rate` synchronously after each scored full submit (v1: no Redis debounce).

## Streak logic (UTC dates)

On qualifying `ACCEPTED` only:

```python
today = utc_today()
if last_active == today - 1 day: current_streak += 1
elif last_active == today: pass
else: current_streak = 1
last_active = today
best_streak = max(best_streak, current_streak)
```

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/leaderboard?period=week\|all&limit=50` | Public |
| GET | `/users/me/stats` | User |
| GET | `/users/me/submissions` | User — paginated (`page`, `limit` per [07-api-routes.md](./07-api-routes.md#pagination)) |
| GET | `/problems/{slug}/submissions/best` | User — own best **qualifying** submission — response: [07-api-routes.md](./07-api-routes.md#best-qualifying-submission) |

## Leaderboard

### All-time (`period=all`)

```sql
SELECT u.username, s.total_score, s.total_solved,
       RANK() OVER (ORDER BY s.total_score DESC, s.total_solved DESC) AS rank
FROM user_stats s
JOIN users u ON u.id = s.user_id
WHERE u.is_active
ORDER BY rank
LIMIT :limit;
```

Cache Redis `leaderboard:all` TTL 60s. On cache miss, run SQL and `SETEX`. **Invalidate** both leaderboard keys on every scored full submit (step 5 in `on_submission_complete`).

### Weekly (`period=week`)

Metric: sum of **best score per problem** from **qualifying** submissions with `created_at >= now() - 7 days` (UTC).

```sql
WITH bests AS (
  SELECT user_id, problem_id, MAX(score) AS best_score
  FROM submissions
  WHERE status = 'ACCEPTED'
    AND run_samples_only = false
    AND created_at >= :week_start
  GROUP BY user_id, problem_id
)
SELECT u.username, SUM(b.best_score) AS weekly_score,
       COUNT(*) AS weekly_solved,
       RANK() OVER (ORDER BY SUM(b.best_score) DESC) AS rank
FROM bests b
JOIN users u ON u.id = b.user_id
GROUP BY u.id, u.username
ORDER BY rank
LIMIT :limit;
```

Cache Redis `leaderboard:week` TTL 60s. Invalidate together with `leaderboard:all` after scoring.

**Weekly edge case:** Qualifying `ACCEPTED` rows with `score = 0` (scoring pending or failed) contribute **0** to `weekly_score` until `score` is set. UI may show lower weekly totals until refresh after scoring completes.

## Complexity display (honest v1)

- `expected_complexity` on problem — manual tag only
- Optional hint if runtime on largest hidden test > 80% of limit

## Files

| Layer | Files |
|-------|-------|
| services | `scoring_service.py`, `leaderboard_service.py`, `stats_service.py` |
| controllers | `leaderboard_controller.py` |
| routers | `leaderboard.py` |

Extend `user_controller` / `UserService` for `/users/me/stats` and `list_my_submissions` if not already present.

Implement `ProblemController.get_best_submission` + `GET /problems/{slug}/submissions/best` per [07-api-routes.md](./07-api-routes.md#best-qualifying-submission).

## Done when

- Score unit tests: 0 for `WRONG_ANSWER`; full bonus path for qualifying `ACCEPTED`
- First qualifying AC increments `total_solved` once and correct `easy_solved` / `medium_solved` / `hard_solved`
- `total_score` equals sum of per-problem qualifying bests
- Weekly vs all-time leaderboards differ correctly
- `SAMPLE_PASSED` never updates stats or acceptance rate
- Full submit `WRONG_ANSWER` updates `acceptance_rate` (denominator) but not `user_stats`
- Leaderboard cache keys deleted after each scored submit
- Worker re-fetches submission after judge before calling `on_submission_complete`
- `scripts/rescore_submission.py` re-runs scoring for stuck `ACCEPTED` + `score=0` rows

## Scoring failures (worker)

Wrap `on_submission_complete` in try/except **after** a successful `judge_service.run()`. On unhandled scoring error when submission is already `ACCEPTED`:

- Log `submission_id` + exception; leave judge fields and `status` unchanged
- Leave `score = 0` (UI shows “scoring pending” via null `best_score` / poll timeout)
- v1: no automatic retry queue — use manual rescore (below)

Judge exceptions still map to `RUNTIME_ERROR` per [05-phase-4-judge.md](./05-phase-4-judge.md).

## Manual scoring recovery (ops)

`scripts/rescore_submission.py` — CLI, calls repos/services directly (no HTTP):

```bash
cd backend
python scripts/rescore_submission.py <submission_uuid>
```

**Behavior:**

1. Load submission; require `status == ACCEPTED` and `run_samples_only == false`
2. Call `scoring_service.on_submission_complete(submission)` (re-fetch row after load)
3. Idempotent: safe to re-run if prior scoring failed or left `score = 0`
4. Do **not** re-enqueue to Redis and do **not** re-run judge — judge fields are already final

Add `rescore_submission.py` to `backend/scripts/` in Phase 5. Document in `.env.example` comment only (no new env vars).

## Tests

- `tests/test_scoring_service.py` — formula edge cases (no partial credit)
- `tests/test_leaderboard_service.py` — weekly vs all-time SQL fixtures
- `tests/test_rescore_submission.py` — CLI/script re-runs `on_submission_complete` for `ACCEPTED` + `score=0` fixture
