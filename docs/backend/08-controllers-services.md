# 08 — Controllers & Services Map

One class per domain. Methods = one HTTP use-case.

**UML class diagram:** [../diagrams/uml-specification.md](../diagrams/uml-specification.md) §2 (application layer).

---

## Controllers

| Class | Methods |
|-------|---------|
| `AuthController` | register, login |
| `UserController` | get_me, update_me, get_my_stats, list_my_submissions |
| `TagController` | list_tags |
| `ProblemController` | list_problems, get_problem, get_best_submission |
| `SubmissionController` | create_submission, get_submission, get_results |
| `LeaderboardController` | get_leaderboard |
| `AdminProblemController` | create, update, unpublish, add_test_cases, create_tag |
| `HealthController` | check |

---

## Services

| Class | Responsibility |
|-------|----------------|
| `AuthService` | register, login, token issue, password rules |
| `UserService` | profile CRUD, stats read |
| `ProblemService` | list/filter, detail w/ sample tests, `user_status` (qualifying submissions; `best_score` null-if-zero rule); `get_best_submission` (Phase 5); admin create validates `arg_style` per language |
| `TagService` | `list_names()` for `GET /tags`; `get_or_create(name)` for admin |
| `SubmissionService` | validate submit, enqueue (JSON queue payload), get status, authorize owner |
| `JudgeService` | at run start: delete prior `submission_results`, reset judge counters; run tests via Judge0, map statuses, bulk-insert results |
| `CodeWrapperService` | inject runner boilerplate per language + `arg_style` |
| `OutputCompareService` | JSON-aware stdout vs expected |
| `Judge0Client` | HTTP to Judge0 API |
| `ScoringService` | score calc, first-AC stats, streak, recompute `total_score` — **Phase 5 worker step**; Redis `DEL` **after** DB commit |
| `LeaderboardService` | all-time + weekly ranked queries + Redis cache; keys invalidated by `ScoringService` post-commit |
| `StatsService` | `acceptance_rate` recompute |
| `RateLimitService` | Redis: submit/min/user, req/min/IP |

---

## Repositories

| Class | Key methods |
|-------|-------------|
| `UserRepo` | get_by_email, get_by_id, create, update |
| `UserStatsRepo` | `get`, `create_default`, `lock_for_update`, `increment_solved_counts` (first AC only: `total_solved` + one of `easy_solved` / `medium_solved` / `hard_solved`), `set_total_score` (full recompute from qualifying `MAX(score)` per problem — **do not** increment `total_score` on each submit) |
| `ProblemRepo` | list_filtered (pagination, tag exact match, search, sort), get_by_slug, create, update, unpublish |
| `TestCaseRepo` | list_by_problem(sample_only?), bulk_create |
| `SubmissionRepo` | create, get_by_id, `set_status(..., touch_updated_at=True)`, list_by_user, `get_best_qualifying`, `had_prior_ac`, `exists_qualifying_ac`, `mark_runtime_error`, `reclaim_stale_running` |
| `SubmissionResultRepo` | `delete_by_submission_id`, `bulk_create` |
| `TagRepo` | `list_names`, get_by_name, create, link_to_problem |

---

## Worker

`submission_worker.py` — full pipeline below is **Phase 5+**. During **Phase 4**, stop after `judge_service.run()` (do not import `ScoringService`). See [05-phase-4-judge.md](./05-phase-4-judge.md).

**Phase 4 only:**

```python
async def process_submission(submission_id: UUID):
    try:
        submission = await submission_repo.get_by_id(submission_id)
        if submission.status != PENDING:
            return  # duplicate queue delivery or already running
        await submission_repo.set_status(submission_id, RUNNING)
        submission = await submission_repo.get_by_id(submission_id)
        await judge_service.run(submission)
    except Exception:
        await submission_repo.mark_runtime_error(submission_id, "...")
```

**Phase 5+ (add scoring step):**

```python
async def process_submission(submission_id: UUID):
    try:
        submission = await submission_repo.get_by_id(submission_id)
        if submission.status != PENDING:
            return  # duplicate queue delivery or already running
        await submission_repo.set_status(submission_id, RUNNING)
        submission = await submission_repo.get_by_id(submission_id)
        await judge_service.run(submission)
        submission = await submission_repo.get_by_id(submission_id)  # refresh before scoring
        if not submission.run_samples_only:
            try:
                await scoring_service.on_submission_complete(submission)
            except Exception:
                log.exception("scoring failed", submission_id=submission_id)
                # leave ACCEPTED + score=0; see 06-phase-5-scoring.md
    except Exception:
        await submission_repo.mark_runtime_error(submission_id, "...")
```

**Startup reclaim:** before loop, reset stale `RUNNING` → `PENDING` and re-enqueue — see [05-phase-4-judge.md](./05-phase-4-judge.md).

**Dev:** `python -m app.workers.submission_worker` (required for queue processing).

**Docker:** `worker` service in compose — [09-env-security.md](./09-env-security.md#submission-worker-v1).

**Prod:** separate worker container + Redis queue. `BackgroundTasks` in uvicorn is optional dev fallback only.

**v1 concurrency:** Run **one** worker process/replica. Before processing, skip if submission status is already terminal (idempotent no-op on duplicate queue delivery). Multi-replica workers are **v2**.

---

## `deps.py` (core)

| Dependency | Use |
|------------|-----|
| `get_current_user` | Required Bearer → User or 401 |
| `get_current_active_user` | 403 if inactive |
| `get_optional_user` | No header → `None`; invalid Bearer → 401; valid → User |
| `require_admin` | 403 unless `role=ADMIN` |

---

## Router → Controller wiring example

```python
# routers/problems.py — optional auth on detail
@router.get("/problems/{slug}")
async def get_problem(
    slug: str,
    user: User | None = Depends(get_optional_user),
    ctrl: ProblemController = Depends(),
):
    return await ctrl.get_problem(slug, user)

# routers/submissions.py
@router.post("", status_code=202)
async def create(
    body: SubmissionCreate,
    user: User = Depends(get_current_active_user),
    ctrl: SubmissionController = Depends(),
):
    return await ctrl.create_submission(user.id, body)
```

---

## Implementation order (per feature)

1. Model + migration  
2. Schema (Pydantic)  
3. Repository  
4. Service  
5. Controller  
6. Router + test  

Match **implementation phase** in [README.md](./README.md), not the `01-database-models` doc number.
