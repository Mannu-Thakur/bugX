from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth_controller import AuthController
from app.core.database import get_db
from app.core.deps import get_current_active_user, oauth2_scheme
from app.models.user import User
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, Token

router = APIRouter()


@router.post("/register", response_model=Token)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)) -> Any:
    controller = AuthController(db)
    return await controller.register(req)


@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)) -> Any:
    controller = AuthController(db)
    return await controller.login(req)


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)) -> Any:
    controller = AuthController(db)
    return await controller.forgot_password(req)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    token: str = Depends(oauth2_scheme),
) -> Any:
    """Blocklist the current JWT so it cannot be reused after logout."""
    from app.core.security import decode_token
    from app.core.config import get_settings
    from redis.asyncio import Redis
    from redis.exceptions import RedisError

    settings = get_settings()

    try:
        payload = decode_token(token)
        exp = payload.get("exp", 0)
        import time
        remaining_ttl = max(int(exp - time.time()), 0)
        if remaining_ttl > 0:
            redis = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            try:
                await redis.setex(f"token_blocklist:{token}", remaining_ttl, "1")
            finally:
                await redis.aclose()
    except (RedisError, Exception) as e:
        # Log but don't fail the logout — the token will expire naturally
        print(f"[Logout] Failed to blocklist token in Redis: {e}")

    return {"message": "Logged out successfully."}
