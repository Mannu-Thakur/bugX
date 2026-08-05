import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, patch

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

    # Use an in-memory store to simulate Redis OTP operations
    _otp_store: dict = {}

    async def fake_store_otp(key: str, otp: str, settings) -> bool:
        _otp_store[key] = otp
        return True

    async def fake_retrieve_and_delete_otp(key: str, settings) -> str | None:
        return _otp_store.pop(key, None)

    with patch("app.services.auth_service._store_otp", side_effect=fake_store_otp), \
         patch("app.services.auth_service._retrieve_and_delete_otp", side_effect=fake_retrieve_and_delete_otp):

        # Step 1: Request OTP
        resp_step1 = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "reset@example.com", "username": "resetuser"}
        )
        assert resp_step1.status_code == 200
        res_data1 = resp_step1.json()
        assert res_data1["code_required"] is True

        # Grab OTP directly from our in-memory store (works regardless of SMTP config)
        otp_key = "reset_otp:reset@example.com:resetuser"
        assert otp_key in _otp_store, "OTP was not stored in fake Redis"
        otp = _otp_store[otp_key]

        # Step 2: Reset password using OTP
        resp_step2 = await client.post(
            "/api/v1/auth/forgot-password",
            json={
                "email": "reset@example.com",
                "username": "resetuser",
                "code": otp,
                "new_password": "NewPassword789"
            }
        )
        assert resp_step2.status_code == 200
        assert resp_step2.json()["message"] == "Password has been reset successfully."

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
