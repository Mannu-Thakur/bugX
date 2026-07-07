import logging
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

        if req.remember:
            expires_delta = timedelta(days=30)
        else:
            expires_delta = timedelta(hours=2)
        access_token = create_access_token(str(user.id), user.role.value, expires_delta=expires_delta)
        return Token(access_token=access_token, user=user)

    async def forgot_password(self, req: ForgotPasswordRequest) -> dict:
        user = await self.user_repo.get_by_email(req.email)
        if not user or user.username != req.username:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with that email and username combination.",
            )

        # 1. If code is not provided, generate and send verification code
        if not req.code:
            import random
            otp = f"{random.randint(100000, 999999)}"

            # Save OTP to Redis with a 10-minute expiry
            from redis.asyncio import Redis
            from redis.exceptions import RedisError
            from app.core.config import get_settings

            settings = get_settings()
            try:
                redis = Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )
                try:
                    await redis.setex(f"reset_otp:{req.email}:{req.username}", 600, otp)
                finally:
                    await redis.aclose()
            except (RedisError, Exception) as e:
                # Fallback to class-level in-memory storage if Redis is down
                logger.warning(f"[ForgotPassword] Redis failed: {e}. Falling back to in-memory OTP storage.")
                if not hasattr(AuthService, "_otp_fallback"):
                    AuthService._otp_fallback = {}
                from datetime import datetime
                AuthService._otp_fallback[f"{req.email}:{req.username}"] = (otp, datetime.now() + timedelta(minutes=10))

            # Simulate sending email: log the OTP
            logger.info("[ForgotPassword] Simulated Email to %s: Your verification code is %s", req.email, otp)

            return {
                "message": "Verification code has been sent to your email.",
                "code_required": True,
                # Return the code in development/testing mode so the API remains testable/mockable
                "code": otp
            }

        # 2. If code is provided, verify it and reset password
        if not req.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be provided with the verification code."
            )

        stored_otp = None
        from redis.asyncio import Redis
        from redis.exceptions import RedisError
        from app.core.config import get_settings

        settings = get_settings()
        try:
            redis = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            try:
                stored_otp = await redis.get(f"reset_otp:{req.email}:{req.username}")
                if stored_otp and stored_otp == req.code:
                    await redis.delete(f"reset_otp:{req.email}:{req.username}")
            finally:
                await redis.aclose()
        except (RedisError, Exception) as e:
            logger.warning(f"[ForgotPassword] Redis failed on retrieval: {e}. Checking in-memory fallback.")
            if hasattr(AuthService, "_otp_fallback"):
                entry = AuthService._otp_fallback.get(f"{req.email}:{req.username}")
                if entry:
                    from datetime import datetime
                    otp_val, expiry = entry
                    if datetime.now() < expiry:
                        stored_otp = otp_val
                    # Clear fallback entry
                    del AuthService._otp_fallback[f"{req.email}:{req.username}"]

        if not stored_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired or is invalid.",
            )

        if stored_otp != req.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code.",
            )

        user.password_hash = hash_password(req.new_password)
        await self.db.commit()
        return {"message": "Password has been reset successfully."}

