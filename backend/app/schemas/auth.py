from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserProfile


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least 1 digit")
        if not any(char.isalpha() for char in v):
            raise ValueError("Password must contain at least 1 letter")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least 1 digit")
        if not any(char.isalpha() for char in v):
            raise ValueError("Password must contain at least 1 letter")
        return v

