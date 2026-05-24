import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, db: AsyncSession):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "username": "testuser", "password": "Password123"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, db: AsyncSession):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "username": "user1", "password": "Password123"}
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "username": "user2", "password": "Password123"}
    )
    assert resp.status_code == 422
    assert resp.json()["detail"] == "EMAIL_TAKEN"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db: AsyncSession):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "username": "loginuser", "password": "Password123"}
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "Password123"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db: AsyncSession):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "wrong@example.com", "username": "wronguser", "password": "Password123"}
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrong@example.com", "password": "wrongpassword"}
    )
    assert resp.status_code == 401
