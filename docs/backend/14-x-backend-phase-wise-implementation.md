# X Backend Phase-wise Implementation Plan

This document is the backend implementation plan for X, the native AI layer of bugX.

X must be built as a first-class extension of the existing FastAPI backend. It must reuse current router, controller, service, repository, schema, auth, Redis, SQLAlchemy, Alembic, and test patterns.

No implementation should begin until the relevant phase is approved.

## Current Backend Shape

Existing backend entry point:

- `backend/app/main.py`

Existing router pattern:

- `backend/app/routers/auth.py`
- `backend/app/routers/oauth.py`
- `backend/app/routers/users.py`
- `backend/app/routers/problems.py`
- `backend/app/routers/submissions.py`
- `backend/app/routers/leaderboard.py`
- `backend/app/routers/battle.py`
- `backend/app/routers/health.py`

Existing layer pattern:

- Routers are thin API bindings.
- Controllers coordinate request-specific behavior.
- Services hold business logic.
- Repositories hold database query logic.
- Schemas use Pydantic v2.
- Models use SQLAlchemy async ORM.
- Redis is used for rate limiting, queues, battle pub/sub, importer cache, and token blocklist.
- Tests use `pytest`, `pytest-asyncio`, `httpx.AsyncClient`, and dependency overrides.

Existing backend context sources X can reuse:

- Problems: `Problem`, `ProblemTemplate`, `TestCase`, `Tag`
- Submissions: `Submission`, `SubmissionResult`
- Users: `User`, `UserStats`, `UserFile`
- Battles: `Battle`, `BattlePlayer`
- Auth: JWT dependencies in `app/core/deps.py`
- Rate limits: `RateLimitService`
- Errors: `app/core/exceptions.py`

## Phase Dependency Graph

Required order:

1. Phase 0 - Analysis
2. Phase 1 - Architecture design
3. Phase 2 - Backend foundation
4. Phase 3 - Frontend foundation contract support
5. Phase 4 - Database layer
6. Phase 5 - Streaming layer
7. Phase 6 - Context system
8. Phase 7 - Problem page integration backend
9. Phase 8 - Editor integration backend
10. Phase 9 - Submission analysis backend
11. Phase 10 - Contest integration backend
12. Phase 11 - Profile insights backend
13. Phase 12 - Vault integration backend
14. Phase 13 - History system backend
15. Phase 14 - Safety rules and hardening

Approval is required after every phase.

## Phase 0 - Project Analysis

### Goals

- Fully document current backend architecture.
- Fully document frontend-to-backend touchpoints.
- Identify the safest extension points for X.
- Confirm no existing stable module needs replacement.

### Files Created

- `docs/backend/x-architecture-analysis.md`

### Files Modified

- None.

### Dependencies

- Existing source tree only.
- No new packages.

### API Changes

- None.

### Database Changes

- None.

### Risks

- Missing a hidden coupling between frontend pages and backend responses.
- Underestimating battle WebSocket behavior.
- Underestimating submission polling and scoring lifecycle.

### Verification Steps

- Review `backend/app/main.py`.
- Review all backend routers.
- Review all controllers, services, repositories, models, schemas.
- Review frontend `src/shared/lib/api.ts`.
- Review problem/editor/submission/battle/profile/vault frontend files.
- Produce an architecture report before coding.

### Approval Gate

- Wait for approval before Phase 1.

## Phase 1 - Backend Architecture Design

### Goals

- Design the X backend module layout.
- Define provider abstraction.
- Define context assembly boundaries.
- Define streaming format.
- Define database entities.
- Define APIs and safety modes.
- Keep X provider-agnostic and loosely coupled.

### Files Created

- `docs/backend/x-backend-architecture-design.md`
- `docs/backend/x-api-contract.md`
- `docs/backend/x-data-model.md`

### Files Modified

- None.

### Dependencies

- Phase 0 report.

### API Changes

- None implemented.
- Proposed endpoints only:
  - `GET /api/v1/x/modes`
  - `POST /api/v1/x/action`
  - `POST /api/v1/x/stream`
  - `POST /api/v1/x/context/preview`
  - `GET /api/v1/x/sessions`
  - `GET /api/v1/x/sessions/{session_id}`
  - `POST /api/v1/x/feedback`
  - `POST /api/v1/x/submissions/{submission_id}/analyze`
  - `POST /api/v1/x/battle/{battle_id}/mentor`
  - `POST /api/v1/x/profile/insights`
  - `POST /api/v1/x/vault/files/{file_id}/summarize`

### Database Changes

- None implemented.
- Proposed tables:
  - `ai_sessions`
  - `ai_conversations`
  - `ai_messages`
  - `ai_feedback`
  - `ai_usage`

### Risks

- Over-designing before usage is proven.
- Designing APIs that do not match the current frontend workflow.
- Coupling provider details into business logic.

### Verification Steps

- Review design against current backend patterns.
- Check that every proposed endpoint has an auth and ownership model.
- Check that each feature can be built without frontend manual context paste.
- Check that contest mode safety is represented.

### Approval Gate

- Wait for approval before Phase 2.

## Phase 2 - Backend Foundation

### Goals

- Add the X backend package skeleton.
- Add provider-agnostic service interfaces.
- Add core X request/response schemas.
- Add X dependencies and config.
- Add rate limiting, timeout, retry, logging, and error foundations.
- Add a mock/local provider so tests can run without external AI APIs.

### Files Created

- `backend/app/routers/x.py`
- `backend/app/controllers/x_controller.py`
- `backend/app/schemas/x.py`
- `backend/app/dependencies/x.py`
- `backend/app/services/x/__init__.py`
- `backend/app/services/x/provider/__init__.py`
- `backend/app/services/x/provider/base.py`
- `backend/app/services/x/provider/mock_provider.py`
- `backend/app/services/x/provider/factory.py`
- `backend/app/services/x/prompts/__init__.py`
- `backend/app/services/x/prompts/registry.py`
- `backend/app/services/x/tools/__init__.py`
- `backend/app/services/x/context/__init__.py`
- `backend/app/services/x/memory/__init__.py`
- `backend/app/services/x/errors.py`
- `backend/app/services/x/metrics.py`
- `backend/app/services/x/rate_limit.py`
- `backend/tests/test_x_provider.py`
- `backend/tests/test_x_router.py`

### Files Modified

- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/services/rate_limit_service.py`
- `backend/requirements.txt`, only if provider SDKs are approved.
- `backend/.env.example`

### Dependencies

- Phase 1 approval.
- Existing auth dependencies.
- Existing Redis rate limiter.
- Existing exception handler format.

### API Changes

Add initial non-streaming endpoints:

- `GET /api/v1/x/modes`
  - Returns supported X modes and safety metadata.
- `POST /api/v1/x/action`
  - Accepts a mode, page scope, user prompt, and optional current frontend context.
  - Returns a structured non-streaming response.

Initial action modes:

- `explain_problem`
- `hint`
- `debug`
- `optimize`
- `complexity`
- `edge_cases`
- `test_cases`
- `refactor`
- `submission_analysis`
- `profile_insights`
- `contest_mentor`
- `vault_summary`

### Database Changes

- None.

### Risks

- X router becomes too large.
- Provider interface becomes too specific to one provider.
- External AI network calls make tests flaky.

### Verification Steps

- `pytest backend/tests/test_x_provider.py`
- `pytest backend/tests/test_x_router.py`
- Verify endpoint requires authenticated user where needed.
- Verify mock provider returns deterministic output.
- Verify rate limit failure uses existing error normalization.
- Verify app starts with X router included.

### Approval Gate

- Wait for approval before Phase 3.

## Phase 3 - Frontend Foundation Contract Support

This phase is frontend-heavy in the master spec. Backend scope is limited to ensuring the X API contract is stable for frontend work.

### Goals

- Stabilize backend response shapes for X UI components.
- Provide mode metadata for frontend tabs/buttons.
- Provide context preview response for frontend debugging.
- Avoid adding frontend-specific hacks into backend logic.

### Files Created

- `backend/tests/test_x_modes_contract.py`

### Files Modified

- `backend/app/schemas/x.py`
- `backend/app/routers/x.py`
- `backend/app/controllers/x_controller.py`

### Dependencies

- Phase 2.

### API Changes

Stabilize:

- `GET /api/v1/x/modes`
- `POST /api/v1/x/context/preview`

Example mode metadata fields:

- `id`
- `label`
- `description`
- `allowed_scopes`
- `requires_code`
- `requires_problem`
- `contest_policy`

### Database Changes

- None.

### Risks

- Contract churn after frontend starts.
- Returning too much context data to the frontend.

### Verification Steps

- Add contract tests for mode metadata.
- Validate response fields match frontend needs.
- Confirm no hidden test cases are exposed in context preview.

### Approval Gate

- Wait for approval before Phase 4.

## Phase 4 - Database Layer

### Goals

- Persist X sessions, conversations, messages, feedback, and usage.
- Track token usage, cost estimate, latency, provider, model, status, and ratings.
- Keep database writes optional for basic mock provider tests.
- Use Alembic migration safely.

### Files Created

- `backend/app/models/ai_session.py`
- `backend/app/models/ai_conversation.py`
- `backend/app/models/ai_message.py`
- `backend/app/models/ai_feedback.py`
- `backend/app/models/ai_usage.py`
- `backend/app/repositories/x_repo.py`
- `backend/alembic/versions/<revision>_add_x_ai_tables.py`
- `backend/tests/test_x_persistence.py`

### Files Modified

- `backend/app/models/__init__.py`
- `backend/app/schemas/x.py`
- `backend/app/services/x/memory/__init__.py`

### Dependencies

- Phase 2.
- Existing SQLAlchemy async base.
- Existing Alembic setup.

### API Changes

Add:

- `GET /api/v1/x/sessions`
- `GET /api/v1/x/sessions/{session_id}`
- `POST /api/v1/x/feedback`

### Database Changes

Create `ai_sessions`:

- `id`
- `user_id`
- `scope`
- `title`
- `problem_id`
- `submission_id`
- `battle_id`
- `current_page`
- `mode`
- `is_pinned`
- `is_favorite`
- `created_at`
- `updated_at`

Create `ai_conversations`:

- `id`
- `session_id`
- `provider`
- `model`
- `status`
- `safety_mode`
- `metadata_json`
- `created_at`
- `updated_at`

Create `ai_messages`:

- `id`
- `conversation_id`
- `role`
- `content`
- `mode`
- `context_snapshot_json`
- `sequence_index`
- `created_at`

Create `ai_feedback`:

- `id`
- `message_id`
- `user_id`
- `rating`
- `reason`
- `created_at`

Create `ai_usage`:

- `id`
- `conversation_id`
- `user_id`
- `provider`
- `model`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `cost_estimate`
- `latency_ms`
- `status`
- `created_at`

### Risks

- Migration breaks SQLite-based tests.
- Persisting sensitive code/context without explicit rules.
- Conversation history grows too quickly.

### Verification Steps

- Run Alembic migration locally.
- Run persistence tests with SQLite.
- Verify user can only read own sessions.
- Verify feedback ownership.
- Verify cascade behavior.
- Verify context snapshots omit hidden test data.

### Approval Gate

- Wait for approval before Phase 5.

## Phase 5 - Streaming Layer

### Goals

- Add streaming-first responses for X.
- Support partial response chunks.
- Support disconnect handling.
- Support stop generation.
- Support provider failures and fallback.

### Files Created

- `backend/app/services/x/streaming.py`
- `backend/app/services/x/cancellation.py`
- `backend/tests/test_x_streaming.py`

### Files Modified

- `backend/app/routers/x.py`
- `backend/app/controllers/x_controller.py`
- `backend/app/services/x/provider/base.py`
- `backend/app/services/x/provider/mock_provider.py`

### Dependencies

- Phase 2.
- Phase 4 if streaming should persist messages immediately.

### API Changes

Add:

- `POST /api/v1/x/stream`
- `POST /api/v1/x/stream/{generation_id}/stop`

SSE event types:

- `start`
- `delta`
- `metadata`
- `error`
- `done`

### Database Changes

- If Phase 4 is complete, persist conversation after stream completion.
- Store failed or partial messages with `status = interrupted` or `status = failed`.

### Risks

- Client disconnects leave provider calls running.
- Streaming response is incompatible with current JSON API wrapper.
- Provider SDKs have different streaming formats.

### Verification Steps

- Test mock streamed chunks.
- Test timeout event.
- Test provider error event.
- Test client disconnect handling where possible.
- Test stop endpoint with cancellation key.

### Approval Gate

- Wait for approval before Phase 6.

## Phase 6 - Context System

### Goals

- Assemble automatic context from backend-owned data.
- Accept volatile frontend-only context such as current editor code.
- Enforce ownership and visibility rules.
- Avoid leaking hidden tests.
- Normalize context into provider-independent packets.

### Files Created

- `backend/app/services/x/context/base.py`
- `backend/app/services/x/context/context_builder.py`
- `backend/app/services/x/context/problem_context.py`
- `backend/app/services/x/context/submission_context.py`
- `backend/app/services/x/context/profile_context.py`
- `backend/app/services/x/context/battle_context.py`
- `backend/app/services/x/context/vault_context.py`
- `backend/app/services/x/context/sanitizer.py`
- `backend/tests/test_x_context.py`

### Files Modified

- `backend/app/schemas/x.py`
- `backend/app/controllers/x_controller.py`
- `backend/app/repositories/x_repo.py`

### Dependencies

- Phase 2.
- Phase 4 for context snapshots.
- Existing repositories and models.

### API Changes

Enhance:

- `POST /api/v1/x/action`
- `POST /api/v1/x/stream`
- `POST /api/v1/x/context/preview`

Context request fields:

- `scope`
- `mode`
- `problem_id`
- `problem_slug`
- `submission_id`
- `battle_id`
- `language`
- `current_code`
- `selected_text`
- `user_prompt`
- `frontend_notes`
- `client_state`

### Database Changes

- No new tables.
- Store sanitized context snapshots in `ai_messages.context_snapshot_json` if Phase 4 is complete.

### Risks

- Backend cannot know unsaved Monaco code unless frontend sends it.
- Context may become too large.
- Hidden tests or private imported problems may leak if visibility checks are missed.

### Verification Steps

- Test public problem context.
- Test private imported problem visibility.
- Test submission ownership.
- Test battle participant-only context.
- Test context size truncation.
- Test hidden tests are excluded except first failing hidden case already revealed by submission result logic.

### Approval Gate

- Wait for approval before Phase 7.

## Phase 7 - Problem Page Integration Backend

### Goals

- Support X actions on problem detail pages.
- Provide explanations, hints, complexity analysis, edge cases, approach comparison, pattern recognition, and test case generation.
- Reuse `ProblemRepo` and existing problem schemas.

### Files Created

- `backend/app/services/x/tools/problem_tools.py`
- `backend/app/services/x/prompts/problem_prompts.py`
- `backend/tests/test_x_problem_actions.py`

### Files Modified

- `backend/app/services/x/prompts/registry.py`
- `backend/app/services/x/context/problem_context.py`
- `backend/app/controllers/x_controller.py`

### Dependencies

- Phase 6.

### API Changes

Use existing:

- `POST /api/v1/x/action`
- `POST /api/v1/x/stream`

Supported modes:

- `explain_problem`
- `hint`
- `complexity`
- `edge_cases`
- `compare_approaches`
- `pattern_recognition`
- `generate_test_cases`

### Database Changes

- No schema changes.
- Optional message persistence through Phase 4 tables.

### Risks

- Generated test cases may look authoritative but not match hidden tests.
- Hints may reveal too much in contest mode.

### Verification Steps

- Test each mode with mock provider.
- Verify problem visibility.
- Verify generated test cases are clearly marked as suggested cases.
- Verify contest active mode downgrades full explanations to hints.

### Approval Gate

- Wait for approval before Phase 8.

## Phase 8 - Editor Integration Backend

### Goals

- Support X from the editor beside Run and Submit.
- Use current code, language, problem metadata, and selected text.
- Provide debug, optimize, refactor, complexity, edge case, and test case help.

### Files Created

- `backend/app/services/x/tools/code_tools.py`
- `backend/app/services/x/prompts/code_prompts.py`
- `backend/tests/test_x_editor_actions.py`

### Files Modified

- `backend/app/schemas/x.py`
- `backend/app/services/x/context/context_builder.py`
- `backend/app/controllers/x_controller.py`

### Dependencies

- Phase 6.
- Existing language enum from submission schemas.

### API Changes

Use:

- `POST /api/v1/x/action`
- `POST /api/v1/x/stream`

Request must include:

- `problem_id` or `problem_slug`
- `language`
- `current_code`
- `mode`

### Database Changes

- No schema changes.

### Risks

- Source code can exceed prompt budget.
- Refactoring output may be mistaken for accepted solution.
- Contest mode must not generate complete code.

### Verification Steps

- Test code size limit.
- Test unsupported language rejection.
- Test no hidden tests in prompt context.
- Test active battle contest mode restricts full solution generation.

### Approval Gate

- Wait for approval before Phase 9.

## Phase 9 - Submission Analysis Backend

### Goals

- Analyze accepted and failed submissions.
- Explain wrong answer, runtime error, compile error, time limit, memory limit, and accepted results.
- Use revealed sample and first failing hidden case data only.

### Files Created

- `backend/app/services/x/tools/submission_tools.py`
- `backend/app/services/x/prompts/submission_prompts.py`
- `backend/tests/test_x_submission_analysis.py`

### Files Modified

- `backend/app/routers/x.py`
- `backend/app/controllers/x_controller.py`
- `backend/app/services/x/context/submission_context.py`

### Dependencies

- Phase 6.
- Existing `SubmissionController.get_results` behavior.

### API Changes

Add:

- `POST /api/v1/x/submissions/{submission_id}/analyze`

Supported result modes:

- `why_failed`
- `fix_direction`
- `optimization`
- `complexity`
- `likely_edge_cases`
- `accepted_review`

### Database Changes

- No schema changes.
- Optional persistence through Phase 4.

### Risks

- Revealing too much about hidden tests.
- Analysis of first failing hidden case must use only backend-approved reveal fields.
- User could attempt to analyze someone else's submission.

### Verification Steps

- Test ownership check.
- Test wrong answer analysis context.
- Test runtime error context.
- Test TLE context.
- Test accepted context.
- Test no unrevealed hidden input/expected/stdout/stderr appears.

### Approval Gate

- Wait for approval before Phase 10.

## Phase 10 - Contest Integration Backend

### Goals

- Support X during battle/contest workflows.
- Enforce hints-only policy during active contests.
- Allow post-contest full review.
- Build contest review context from battle room, players, attempts, scores, solve times, and submissions.

### Files Created

- `backend/app/services/x/tools/battle_tools.py`
- `backend/app/services/x/prompts/battle_prompts.py`
- `backend/tests/test_x_contest_safety.py`
- `backend/tests/test_x_battle_review.py`

### Files Modified

- `backend/app/routers/x.py`
- `backend/app/services/x/context/battle_context.py`
- `backend/app/services/x/prompts/registry.py`

### Dependencies

- Phase 6.
- Existing `Battle`, `BattlePlayer`, submission scoring, and battle WebSocket state.

### API Changes

Add:

- `POST /api/v1/x/battle/{battle_id}/mentor`
- `POST /api/v1/x/battle/{battle_id}/review`

Active battle allowed modes:

- `hint`
- `pattern_recognition`
- `constraint_explanation`
- `complexity_guidance`

Finished battle allowed modes:

- `contest_review`
- `mistake_analysis`
- `weak_topic_summary`
- `revision_recommendations`

### Database Changes

- No new tables.
- Optional persistence through Phase 4.

### Risks

- Full solution leakage during active battle.
- Spectators accessing battle context.
- Battle status race between active and finished.

### Verification Steps

- Test participant-only access.
- Test nonparticipant rejection.
- Test active battle prompt denies full code.
- Test finished battle allows full review.
- Test battle context includes attempts/scores but not other users' private unrelated history.

### Approval Gate

- Wait for approval before Phase 11.

## Phase 11 - Profile Insights Backend

### Goals

- Generate X Insights for profile.
- Analyze rating-like trends, score, solved counts, accuracy, speed, consistency, weak topics, and battle stats.
- Recommend next problems and revision roadmap.

### Files Created

- `backend/app/services/x/tools/profile_tools.py`
- `backend/app/services/x/prompts/profile_prompts.py`
- `backend/tests/test_x_profile_insights.py`

### Files Modified

- `backend/app/routers/x.py`
- `backend/app/services/x/context/profile_context.py`
- `backend/app/controllers/x_controller.py`

### Dependencies

- Phase 6.
- Existing `UserController.get_my_stats`.
- Existing submissions history endpoint behavior.

### API Changes

Add:

- `POST /api/v1/x/profile/insights`
- `POST /api/v1/x/profile/recommendations`

### Database Changes

- No schema changes.
- Optional persistence through Phase 4.

### Risks

- Slow queries over large submission history.
- Weak topic inference may be poor if tags are sparse.
- Recommendations need to respect private/imported problem visibility.

### Verification Steps

- Test insights for new user with no submissions.
- Test insights for user with mixed accepted/failed submissions.
- Test recommendations only include visible problems.
- Test response stays stable with missing tags or stats.

### Approval Gate

- Wait for approval before Phase 12.

## Phase 12 - Vault Integration Backend

### Goals

- Allow X to summarize user vault files.
- Generate flashcards and revision sheets.
- Explain bookmarked or uploaded study resources.
- Enforce file ownership and size/content-type limits.

### Files Created

- `backend/app/services/x/tools/vault_tools.py`
- `backend/app/services/x/prompts/vault_prompts.py`
- `backend/app/services/x/context/file_extractors.py`
- `backend/tests/test_x_vault.py`

### Files Modified

- `backend/app/routers/x.py`
- `backend/app/services/x/context/vault_context.py`
- `backend/app/services/user_service.py`, only if a reusable safe file-read helper is needed.

### Dependencies

- Phase 6.
- Existing `UserFile` storage model.
- Existing upload/download ownership checks.

### API Changes

Add:

- `POST /api/v1/x/vault/files/{file_id}/summarize`
- `POST /api/v1/x/vault/files/{file_id}/flashcards`
- `POST /api/v1/x/vault/files/{file_id}/revision-sheet`

### Database Changes

- No schema changes.
- Optional history persistence through Phase 4.

### Risks

- Unsafe file path handling.
- Large or binary files exceed context limits.
- Parsing PDFs/DOCX may require new dependencies.

### Verification Steps

- Test ownership check.
- Test unsupported file type handling.
- Test path traversal protection.
- Test size limit handling.
- Test text and markdown extraction.

### Approval Gate

- Wait for approval before Phase 13.

## Phase 13 - History System Backend

### Goals

- Support conversation history.
- Support search, favorites, pinning, feedback, and export.
- Make X feel continuous across bugX pages.

### Files Created

- `backend/app/services/x/history_service.py`
- `backend/app/services/x/export_service.py`
- `backend/tests/test_x_history.py`
- `backend/tests/test_x_export.py`

### Files Modified

- `backend/app/routers/x.py`
- `backend/app/repositories/x_repo.py`
- `backend/app/schemas/x.py`

### Dependencies

- Phase 4.
- Phase 5 for streamed message persistence.

### API Changes

Add:

- `GET /api/v1/x/sessions`
- `GET /api/v1/x/sessions/{session_id}`
- `PATCH /api/v1/x/sessions/{session_id}`
- `DELETE /api/v1/x/sessions/{session_id}`
- `GET /api/v1/x/sessions/search`
- `POST /api/v1/x/messages/{message_id}/feedback`
- `GET /api/v1/x/sessions/{session_id}/export`

### Database Changes

- No new tables if Phase 4 schema is sufficient.
- Possible migration for indexes:
  - `ai_sessions.user_id`
  - `ai_sessions.updated_at`
  - `ai_messages.conversation_id`
  - `ai_feedback.user_id`

### Risks

- Search over message content may be slow.
- Export can leak sensitive code if sent to wrong user.
- Delete behavior must be clear: soft delete vs hard delete.

### Verification Steps

- Test session ownership.
- Test pagination.
- Test pin/favorite updates.
- Test feedback update and duplicate prevention.
- Test export content belongs only to authenticated user.

### Approval Gate

- Wait for approval before Phase 14.

## Phase 14 - Safety Rules and Hardening

### Goals

- Enforce X safety behavior across all modes.
- Add contest-mode restrictions.
- Add structured logging and metrics.
- Add provider circuit breakers and fallback providers.
- Add caching where safe.
- Add regression tests.

### Files Created

- `backend/app/services/x/safety.py`
- `backend/app/services/x/policy.py`
- `backend/app/services/x/cache.py`
- `backend/tests/test_x_safety.py`
- `backend/tests/test_x_regression.py`

### Files Modified

- `backend/app/services/x/provider/factory.py`
- `backend/app/services/x/metrics.py`
- `backend/app/services/x/rate_limit.py`
- `backend/app/services/x/context/sanitizer.py`
- `backend/app/routers/health.py`, if X provider health is added to health output.

### Dependencies

- All previous phases.
- Existing `RedisCircuitBreaker` can be reused or adapted.
- Existing `RateLimitService`.

### API Changes

Optional:

- `GET /api/v1/x/health`
- `GET /api/v1/x/usage`

Safety policies:

- Practice mode:
  - Explanations allowed.
  - Debugging allowed.
  - Refactoring allowed.
  - Full code only if explicitly permitted by product policy.
- Active contest/battle mode:
  - Hints only by default.
  - No complete code generation.
  - No direct final answer.
  - Pattern and complexity guidance allowed.
- Finished contest/battle mode:
  - Full review allowed.
  - Mistake analysis allowed.
  - Revision recommendations allowed.

### Database Changes

- No new tables.
- Optional provider health metrics can remain in Redis.

### Risks

- Safety rules applied inconsistently by mode.
- Prompt injection inside problem statements, notes, or uploaded files.
- Provider outage degrades user experience.
- Token cost tracking becomes inaccurate.

### Verification Steps

- Test every mode under practice context.
- Test every mode under active battle context.
- Test every mode under finished battle context.
- Test prompt injection text in problem descriptions and uploaded files.
- Test provider timeout, fallback, and circuit breaker.
- Test usage records for success, failure, and cancellation.
- Run full backend regression suite.

### Approval Gate

- Final backend hardening approval before frontend rollout or production release.

## Proposed Backend Directory Structure

```text
backend/app/
  routers/
    x.py
  controllers/
    x_controller.py
  dependencies/
    x.py
  schemas/
    x.py
  models/
    ai_session.py
    ai_conversation.py
    ai_message.py
    ai_feedback.py
    ai_usage.py
  repositories/
    x_repo.py
  services/
    x/
      __init__.py
      errors.py
      metrics.py
      rate_limit.py
      safety.py
      policy.py
      streaming.py
      cancellation.py
      cache.py
      history_service.py
      export_service.py
      provider/
        __init__.py
        base.py
        factory.py
        mock_provider.py
        openai_provider.py
        gemini_provider.py
        anthropic_provider.py
        local_provider.py
      context/
        __init__.py
        base.py
        context_builder.py
        sanitizer.py
        problem_context.py
        submission_context.py
        profile_context.py
        battle_context.py
        vault_context.py
        file_extractors.py
      prompts/
        __init__.py
        registry.py
        problem_prompts.py
        code_prompts.py
        submission_prompts.py
        battle_prompts.py
        profile_prompts.py
        vault_prompts.py
      tools/
        __init__.py
        problem_tools.py
        code_tools.py
        submission_tools.py
        battle_tools.py
        profile_tools.py
        vault_tools.py
      memory/
        __init__.py
```

## Proposed Settings

Add to `backend/app/core/config.py`:

```text
X_ENABLED=true
X_PROVIDER=mock
X_MODEL=mock-x
X_FALLBACK_PROVIDERS=
X_TIMEOUT_SECONDS=30
X_STREAM_TIMEOUT_SECONDS=60
X_MAX_CONTEXT_CHARS=30000
X_MAX_OUTPUT_TOKENS=1200
X_RATE_LIMIT_PER_MINUTE=20
X_STORE_HISTORY=true
X_DEFAULT_SAFETY_MODE=practice

OPENAI_API_KEY=
OPENAI_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
LOCAL_LLM_URL=
LOCAL_LLM_MODEL=
```

## Initial API Contract Summary

### `GET /api/v1/x/modes`

Returns mode metadata for frontend controls.

### `POST /api/v1/x/context/preview`

Returns sanitized context preview for debugging and tests.

### `POST /api/v1/x/action`

Non-streaming X response.

### `POST /api/v1/x/stream`

Streaming X response over SSE.

### `POST /api/v1/x/submissions/{submission_id}/analyze`

Submission-specific X analysis.

### `POST /api/v1/x/battle/{battle_id}/mentor`

Contest/battle mentorship with active-battle safety restrictions.

### `POST /api/v1/x/profile/insights`

Profile and learning insights.

### `POST /api/v1/x/vault/files/{file_id}/summarize`

Vault file summarization.

## Verification Strategy

Minimum test groups:

- Provider tests
- Router contract tests
- Context ownership tests
- Streaming tests
- Persistence tests
- Submission analysis tests
- Contest safety tests
- Profile insight tests
- Vault ownership tests
- History and feedback tests
- Regression tests for existing auth/problems/submissions/battle flows

Suggested commands:

```powershell
cd backend
pytest tests/test_x_provider.py
pytest tests/test_x_router.py
pytest tests/test_x_context.py
pytest tests/test_x_streaming.py
pytest tests/test_x_persistence.py
pytest tests/test_x_submission_analysis.py
pytest tests/test_x_contest_safety.py
pytest tests/test_x_history.py
pytest
```

## Non-negotiable Implementation Rules

- Do not bypass existing auth dependencies.
- Do not expose hidden test cases.
- Do not let users access other users' submissions, files, sessions, or private imported problems.
- Do not couple business logic to OpenAI, Gemini, Anthropic, or a local provider.
- Do not create a separate AI backend service unless explicitly approved later.
- Do not rewrite stable problem, submission, battle, auth, user, or scoring modules.
- Prefer extension over replacement.
- Require approval after every phase.
