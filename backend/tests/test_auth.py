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


@pytest.mark.asyncio
async def test_login_username_success(client: AsyncClient, db: AsyncSession):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login_u@example.com", "username": "loginuser_u", "password": "Password123"}
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser_u", "password": "Password123"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_username_wrong_password(client: AsyncClient, db: AsyncSession):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "wrong_u@example.com", "username": "wronguser_u", "password": "Password123"}
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "wronguser_u", "password": "wrongpassword"}
    )
    assert resp.status_code == 401



@pytest.mark.asyncio
async def test_forgot_password_success(client: AsyncClient, db: AsyncSession):
    # Register user
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset@example.com", "username": "resetuser", "password": "Password123"}
    )
    # Reset password
    resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com", "username": "resetuser", "new_password": "NewPassword789"}
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Password has been reset successfully."

    # Login with new password
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "NewPassword789"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


@pytest.mark.asyncio
async def test_forgot_password_invalid_combo(client: AsyncClient, db: AsyncSession):
    # Register user
    await client.post(
        "/api/v1/auth/register",
        json={"email": "reset2@example.com", "username": "resetuser2", "password": "Password123"}
    )
    # Attempt reset with wrong username
    resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset2@example.com", "username": "wronguser", "new_password": "NewPassword789"}
    )
    assert resp.status_code == 404

    # Attempt reset with non-existent email
    resp2 = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent@example.com", "username": "resetuser2", "new_password": "NewPassword789"}
    )
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_forgot_password_invalid_password(client: AsyncClient, db: AsyncSession):
    # Attempt reset with invalid password (no digit)
    resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com", "username": "resetuser", "new_password": "NoDigitPassword"}
    )
    assert resp.status_code == 422
