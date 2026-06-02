from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth_controller import AuthController
from app.core.database import get_db
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
