import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, db: AsyncSession):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "username": "meuser", "password": "Password123"}
    )
    token = resp.json()["access_token"]

    resp_me = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["username"] == "meuser"


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient, db: AsyncSession):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "update@example.com", "username": "updateme", "password": "Password123"}
    )
    token = resp.json()["access_token"]

    resp_patch = await client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"username": "newusername"}
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["username"] == "newusername"
