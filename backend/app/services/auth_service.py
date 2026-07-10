import logging
import secrets
from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import RoleEnum, User
from app.models.user_stats import UserStats
from app.repositories.user_repo import UserRepo
from app.repositories.user_stats_repo import UserStatsRepo
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, Token

# Redis OTP key prefix and TTL
_OTP_PREFIX = "reset_otp"
_OTP_TTL_SECONDS = 600  # 10 minutes


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepo(db)
        self.user_stats_repo = UserStatsRepo(db)

    async def register(self, req: RegisterRequest) -> Token:
        if await self.user_repo.get_by_email(req.email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="EMAIL_TAKEN"
            )
        if await self.user_repo.get_by_username(req.username):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="USERNAME_TAKEN"
            )

        hashed_password = hash_password(req.password)
        new_user = User(
            email=req.email,
            username=req.username,
            password_hash=hashed_password,
            role=RoleEnum.USER,
        )
        self.db.add(new_user)
        await self.db.flush()

        new_stats = UserStats(user_id=new_user.id)
        self.db.add(new_stats)
        await self.db.commit()
        await self.db.refresh(new_user)

        access_token = create_access_token(str(new_user.id), new_user.role.value)
        return Token(access_token=access_token, user=new_user)

    async def login(self, req: LoginRequest) -> Token:
        user = None
        if "@" in req.email:
            user = await self.user_repo.get_by_email(req.email)
        if not user:
            user = await self.user_repo.get_by_username(req.email)

        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
        )
        if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
            raise credentials_exception

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="FORBIDDEN"
            )

        expires_delta = timedelta(days=30) if req.remember else timedelta(hours=2)
        access_token = create_access_token(str(user.id), user.role.value, expires_delta=expires_delta)
        return Token(access_token=access_token, user=user)

    async def forgot_password(self, req: ForgotPasswordRequest) -> dict:
        from app.core.config import get_settings
        settings = get_settings()

        user = await self.user_repo.get_by_email(req.email)
        if not user or user.username != req.username:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with that email and username combination.",
            )

        # ── Phase 1: Generate and dispatch OTP ───────────────────────────────
        if not req.code:
            # Cryptographically secure 6-digit OTP
            otp = f"{secrets.randbelow(900_000) + 100_000}"
            otp_key = f"{_OTP_PREFIX}:{req.email}:{req.username}"

            # Persist OTP in Redis (primary) with a 10-minute TTL
            stored = await _store_otp(otp_key, otp, settings)

            if not stored:
                # Redis unavailable — cannot safely issue a reset
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Password reset is temporarily unavailable. Please try again shortly.",
                )

            # Send real email if SMTP is configured
            email_sent = False
            if settings.smtp_configured:
                from app.services.email_service import send_otp_email
                email_sent = await send_otp_email(to=req.email, otp=otp)
                if not email_sent:
                    logger.error(
                        "[ForgotPassword] SMTP configured but email failed to send to %s. "
                        "OTP is in the server logs for manual recovery.",
                        req.email,
                    )

            # Always log OTP server-side (useful in all environments for ops / debugging)
            logger.info(
                "[ForgotPassword] OTP for %s (username=%s): %s  [email_sent=%s]",
                req.email, req.username, otp, email_sent,
            )

            response: dict = {
                "message": (
                    "A verification code has been sent to your email."
                    if email_sent
                    else "Verification code generated. Check server logs."
                ),
                "code_required": True,
                "email_sent": email_sent,
            }

            # In development without SMTP, surface the OTP in the response so the
            # API remains testable without needing a real mailbox.
            # NEVER exposed in production.
            if settings.is_development and not settings.smtp_configured:
                response["dev_code"] = otp
                response["dev_note"] = (
                    "OTP returned only because ENV=development and SMTP is not configured. "
                    "Configure SMTP_HOST/USER/PASSWORD in .env to enable real email."
                )

            return response

        # ── Phase 2: Verify OTP and reset password ────────────────────────────
        if not req.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="new_password is required when submitting a verification code.",
            )

        otp_key = f"{_OTP_PREFIX}:{req.email}:{req.username}"
        stored_otp = await _retrieve_and_delete_otp(otp_key, settings)

        if not stored_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired or is invalid. Please request a new one.",
            )

        # Constant-time comparison prevents timing attacks
        if not secrets.compare_digest(stored_otp, req.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code.",
            )

        user.password_hash = hash_password(req.new_password)
        await self.db.commit()
        logger.info("[ForgotPassword] Password reset successfully for %s", req.email)
        return {"message": "Password has been reset successfully."}


# ── Private Redis helpers ─────────────────────────────────────────────────────

async def _store_otp(key: str, otp: str, settings) -> bool:
    """
    Persist OTP in Redis with TTL.
    Returns True on success, False if Redis is unavailable.
    """
    from redis.asyncio import Redis
    from redis.exceptions import RedisError
    try:
        redis = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        try:
            await redis.set(key, otp, ex=_OTP_TTL_SECONDS)
            return True
        finally:
            await redis.aclose()
    except (RedisError, Exception) as exc:
        logger.error("[ForgotPassword] Redis unavailable, cannot store OTP: %s", exc)
        return False


async def _retrieve_and_delete_otp(key: str, settings) -> str | None:
    """
    Atomically fetch and delete the OTP from Redis.
    Returns the stored OTP string, or None if missing / Redis is down.
    """
    from redis.asyncio import Redis
    from redis.exceptions import RedisError
    try:
        redis = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        try:
            # GETDEL atomically reads and removes — no second window for reuse
            stored = await redis.getdel(key)
            return stored
        finally:
            await redis.aclose()
    except (RedisError, Exception) as exc:
        logger.error("[ForgotPassword] Redis unavailable, cannot retrieve OTP: %s", exc)
        return None
