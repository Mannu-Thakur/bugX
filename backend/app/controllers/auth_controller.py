from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, RegisterRequest, Token
from app.services.auth_service import AuthService


class AuthController:
    def __init__(self, db: AsyncSession):
        self.auth_service = AuthService(db)

    async def register(self, req: RegisterRequest) -> Token:
        return await self.auth_service.register(req)

    async def login(self, req: LoginRequest) -> Token:
        return await self.auth_service.login(req)
