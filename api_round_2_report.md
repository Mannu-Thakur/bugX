# API Round 2 Report

Date/time: 2026-05-25 06:25:28 +05:30
Agent: Codex GPT-5
Backend commit/branch: `frontend` @ `2e0e4f7904b08933c6ad0087de3b6784ca928fd8`
API base URL: `http://test/api/v1` via FastAPI `ASGITransport`; `http://localhost:8000/api/v1` was not running.
Database URL used: `sqlite+aiosqlite:///:memory:`
Redis/Judge0 status: Not required for Round 2; external services were not available from this shell.
Worker status: Not applicable for Round 2.

## Summary

- Total cases: 18
- Passed: 17
- Failed: 1
- Blocked: 0
- Not run: 0
- Raw results: `backend/api_round_2_raw_results.json`

## Environment Verification

- API reachable: Yes through in-process FastAPI ASGI transport. `curl http://localhost:8000/api/v1/health` failed because no server was listening on port 8000.
- DB reachable: Yes, isolated SQLite test DB. Configured local PostgreSQL was not used because Docker/Postgres was not available on PATH.
- Redis reachable: Not verified; not needed for login/profile cases.
- Judge0 reachable: Not verified; not needed for login/profile cases.
- Worker processing submissions: Not applicable.
- Notes: Installed backend dependencies into ignored workspace venv `backend/.venv`. Existing auth/user pytest smoke tests passed: `6 passed`.

## Case Results

| Case ID | Endpoint | Expected | Actual | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| R2-01 | `POST /auth/login` | `200 Token`; user matches registered primary | `200` matching token/user shape | PASS | Token redacted in raw results. |
| R2-02 | `POST /auth/login` | `401`; generic bad credentials | `401`; `Incorrect email or password`, `UNAUTHORIZED` | PASS | Wrong password. |
| R2-03 | `POST /auth/login` | `401`; generic bad credentials | `401`; `Incorrect email or password`, `UNAUTHORIZED` | PASS | Unknown email. |
| R2-04 | `POST /auth/login` | `422`; `VALIDATION_ERROR` | `422`; email validation list | PASS | Invalid email shape. |
| R2-05 | `POST /auth/login` | `422`; `VALIDATION_ERROR` | `422`; missing password validation list | PASS | Missing password. |
| R2-06 | `GET /users/me` | `200 UserProfile`; no password hash | `200`; profile shape, no password hash | PASS | Valid token. |
| R2-07 | `GET /users/me` | `401`; `UNAUTHORIZED` | `401`; `Could not validate credentials` | PASS | No token. |
| R2-08 | `GET /users/me` | `401`; `UNAUTHORIZED` | `401`; `Could not validate credentials` | PASS | `Bearer not-a-jwt`. |
| R2-09 | `GET /users/me` | `401`; `UNAUTHORIZED` | `401`; `Could not validate credentials` | PASS | Tampered token. |
| R2-10 | `GET /users/me` | `401`; `UNAUTHORIZED` | `401`; `Could not validate credentials` | PASS | Expired token signed with app secret. |
| R2-11 | `GET /users/me` | `403`; `Inactive user`, `FORBIDDEN` | `403`; `Inactive user`, `FORBIDDEN` | PASS | User deactivated directly in DB after token issue. |
| R2-12 | `PATCH /users/me` | `200`; username changed | `200`; username changed | PASS | Renamed primary user. |
| R2-13 | `PATCH /users/me` | `200`; avatar updated | `200`; avatar set to `https://example.com/a.png` | PASS | Avatar set. |
| R2-14 | `PATCH /users/me` | `422`; `USERNAME_TAKEN`, `ERROR` | `422`; `USERNAME_TAKEN`, `ERROR` | PASS | Duplicate secondary username. |
| R2-15 | `PATCH /users/me` | `422`; `VALIDATION_ERROR` | `422`; pattern validation list | PASS | Invalid username chars. |
| R2-16 | `PATCH /users/me` | `422`; `VALIDATION_ERROR` | `422`; min length validation list | PASS | Username length 2. |
| R2-17 | `PATCH /users/me` | `422`; `VALIDATION_ERROR` | `422`; max length validation list | PASS | Avatar URL length 513. |
| R2-18 | `PATCH /users/me` | `200`; preserve existing avatar on `{}` | `200`; `avatar_url: null` | FAIL | Empty patch clears avatar unexpectedly. |

## Response Samples

Successful login:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "email": "round-2-1779670431-primary@example.com",
    "username": "round_2_1779670431_primary",
    "role": "USER",
    "avatar_url": null,
    "is_active": true
  }
}
```

Invalid token response:

```json
{
  "detail": "Could not validate credentials",
  "code": "UNAUTHORIZED"
}
```

Inactive user response:

```json
{
  "detail": "Inactive user",
  "code": "FORBIDDEN"
}
```

Empty patch after setting avatar:

```json
{
  "email": "round-2-1779670431-primary@example.com",
  "username": "round_2_1779670431_renamed",
  "avatar_url": null,
  "is_active": true
}
```

## Issues Found

### Issue 1 - Empty profile patch clears avatar

- Severity: Medium
- Endpoint: `PATCH /api/v1/users/me`
- Case IDs: R2-18
- Expected: Sending `{}` after an avatar is set should preserve the existing `avatar_url`.
- Actual: The response was `200`, but `avatar_url` changed from `https://example.com/a.png` to `null`.
- Reproduction command or Python snippet:

```python
await client.patch("/api/v1/users/me", token=token, json={"avatar_url": "https://example.com/a.png"})
await client.patch("/api/v1/users/me", token=token, json={})
```

- Suspected source file/function: `backend/app/services/user_service.py`, `UserService.update_me`, lines 23-24.
- Suggested fix: Use Pydantic's set-field tracking, for example `if "avatar_url" in req.model_fields_set:` or update from `req.model_dump(exclude_unset=True)`, so omitted fields are not treated as explicit `null`.

## Regression Risks

- Changing omitted-field handling should preserve the ability to intentionally clear `avatar_url` with `{"avatar_url": null}` if that is desired product behavior.
- Add tests for `{}`, username-only patch, avatar-only patch, and explicit null avatar patch.

## Suggested Follow-Up Tests

- Re-run Round 2 against the real `localhost:8000` stack once Docker/PostgreSQL/Redis are available.
- Add a focused unit/integration test for `PATCH /users/me` partial-update semantics.
