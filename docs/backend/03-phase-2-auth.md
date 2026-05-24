# Implementation Phase 2 — Auth & Users

**Goal:** Register, login, JWT access token, protected routes, profile, `user_stats` row on signup.

**v1:** No refresh tokens (no `refresh_tokens` table, no `/auth/refresh`).

## Endpoints

See [07-api-routes.md](./07-api-routes.md) — Auth + Users sections.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register`, `/auth/login` | Issue access JWT |
| GET | `/users/me` | Profile |
| PATCH | `/users/me` | Update `username` and/or `avatar_url` (unique username check) |

## Files

| Layer | Files |
|-------|-------|
| models | `user.py`, `user_stats.py` |
| schemas | `auth.py`, `user.py` |
| repositories | `user_repo.py`, `user_stats_repo.py` |
| services | `auth_service.py`, `user_service.py` |
| controllers | `auth_controller.py`, `user_controller.py` |
| routers | `auth.py`, `users.py` |
| core | `security.py` (hash, JWT), `deps.py` (get_current_user, get_current_active_user, require_admin) |

## `security.py`

```python
hash_password(plain) -> str
verify_password(plain, hash) -> bool
create_access_token(sub: user_id, role) -> str
decode_token(token) -> payload
```

- Algorithm: HS256
- Access token TTL: 60 min (config)
- Payload: `{ sub, role, exp }`
- bcrypt cost: 12

## `deps.py`

```python
get_current_user(token) -> User              # 401 if invalid/missing when required
get_current_active_user(user) -> User        # 403 if inactive
get_optional_user(request) -> User | None    # None if no Bearer; 401 if Bearer invalid
require_admin(user) -> User                  # 403 if not ADMIN
```

`get_optional_user` is implemented in Phase 2 but first used on `GET /problems/{slug}` in Phase 3.

## `auth_service.register`

1. Validate `RegisterRequest` per [07-api-routes.md](./07-api-routes.md#registerrequest-validation)
2. Check email unique → **422** `EMAIL_TAKEN`
3. Check username unique → **422** `USERNAME_TAKEN`
4. Hash password
5. Insert user with `role=USER` only (never `ADMIN` from public API) + empty `user_stats` (single transaction)
6. Return `{ access_token, user }`

## `auth_service.login`

1. Find by email → **401** if missing or wrong password (same message for both)
2. Verify password
3. If `user.is_active == false` → **403** `FORBIDDEN` (do not issue a token)
4. Return `{ access_token, user }`

Protected routes use `get_current_active_user` (not just `get_current_user`) so inactive accounts cannot call APIs with an old token.

## `user_service.update_me`

1. If `username` changed: validate pattern + uniqueness → **422** `USERNAME_TAKEN`
2. If `avatar_url` set: max 512 chars; allow `null` to clear
3. Update allowed fields only (`username`, `avatar_url`); set `users.updated_at = now(UTC)` on any change
4. Return updated `UserProfile`

## Validation rules (canonical)

| Field | Rules |
|-------|--------|
| `email` | Pydantic `EmailStr`; max 255 |
| `username` | 3–50 chars; `^[a-zA-Z0-9_-]+$` |
| `password` | Min 8 chars; ≥1 letter and ≥1 digit |

## Router mount

```python
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
```

## Done when

- Register/login in Swagger with validation errors for bad email/username/password
- `GET /users/me` and `PATCH /users/me` work with Bearer token
- Invalid token → 401
- Inactive user login → 403; `GET /users/me` with valid token but `is_active=false` → 403
- No refresh-token routes in OpenAPI

## Migration

- `users`, `user_stats` only

## Tests

- `tests/test_auth.py` — register success; duplicate email/username; login success; wrong password 401; inactive 403
- `tests/test_users.py` — `GET/PATCH /users/me`; unauthorized 401
