from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

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
        user = await self.user_repo.get_by_email(req.email)
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        if not user or not verify_password(req.password, user.password_hash):
            raise credentials_exception

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="FORBIDDEN"
            )

        access_token = create_access_token(str(user.id), user.role.value)
        return Token(access_token=access_token, user=user)

    async def forgot_password(self, req: ForgotPasswordRequest) -> dict:
        user = await self.user_repo.get_by_email(req.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User with this email does not exist",
            )
        
        user.password_hash = hash_password(req.new_password)
        self.db.add(user)
        await self.db.commit()
        return {"message": "Password reset successfully"}
