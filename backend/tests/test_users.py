import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings


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
        json={
            "username": "newusername",
            "leetcode_url": "https://leetcode.com/u/newusername",
            "github_url": "https://github.com/newusername",
            "linkedin_url": "https://linkedin.com/in/newusername",
            "portfolio_url": "https://newusername.dev",
        }
    )
    assert resp_patch.status_code == 200
    data = resp_patch.json()
    assert data["username"] == "newusername"
    assert data["leetcode_url"] == "https://leetcode.com/u/newusername"
    assert data["github_url"] == "https://github.com/newusername"
    assert data["linkedin_url"] == "https://linkedin.com/in/newusername"
    assert data["portfolio_url"] == "https://newusername.dev"


@pytest.mark.asyncio
async def test_upload_avatar_uses_backend_storage(client: AsyncClient, db: AsyncSession, tmp_path):
    settings = get_settings()
    old_storage_dir = settings.STORAGE_DIR
    settings.STORAGE_DIR = str(tmp_path)

    try:
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "avatar@example.com", "username": "avataruser", "password": "Password123"}
        )
        token = resp.json()["access_token"]

        resp_upload = await client.post(
            "/api/v1/users/me/avatar",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("avatar.png", b"fake-png-bytes", "image/png")},
        )

        assert resp_upload.status_code == 200
        avatar_url = resp_upload.json()["avatar_url"]
        assert avatar_url.startswith("/uploads/avatars/")
        assert (tmp_path / "public" / "avatars" / avatar_url.rsplit("/", 1)[-1]).exists()
    finally:
        settings.STORAGE_DIR = old_storage_dir


@pytest.mark.asyncio
async def test_user_file_vault_upload_download_delete(client: AsyncClient, db: AsyncSession, tmp_path):
    settings = get_settings()
    old_storage_dir = settings.STORAGE_DIR
    settings.STORAGE_DIR = str(tmp_path)

    try:
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "files@example.com", "username": "fileuser", "password": "Password123"}
        )
        token = resp.json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        resp_upload = await client.post(
            "/api/v1/users/me/files?subject=dbms",
            headers=auth,
            files={"file": ("notes.txt", b"normalization notes", "text/plain")},
        )
        assert resp_upload.status_code == 200
        uploaded = resp_upload.json()
        assert uploaded["name"] == "notes.txt"
        assert uploaded["subject"] == "dbms"

        resp_list = await client.get("/api/v1/users/me/files?subject=dbms", headers=auth)
        assert resp_list.status_code == 200
        assert len(resp_list.json()) == 1

        resp_download = await client.get(f"/api/v1/users/me/files/{uploaded['id']}/download", headers=auth)
        assert resp_download.status_code == 200
        assert resp_download.content == b"normalization notes"

        resp_delete = await client.delete(f"/api/v1/users/me/files/{uploaded['id']}", headers=auth)
        assert resp_delete.status_code == 204

        resp_list_after_delete = await client.get("/api/v1/users/me/files?subject=dbms", headers=auth)
        assert resp_list_after_delete.json() == []
    finally:
        settings.STORAGE_DIR = old_storage_dir


@pytest.mark.asyncio
async def test_get_my_stats_streak_stale(client: AsyncClient, db: AsyncSession):
    # 1. Register a user
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "streak@example.com", "username": "streakuser", "password": "Password123"}
    )
    token = resp.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    # 2. Query the user from the database to get their user ID
    from sqlalchemy import select
    from app.models.user import User
    from app.models.user_stats import UserStats
    from datetime import datetime, timedelta, timezone

    user_stmt = select(User).where(User.username == "streakuser")
    res = await db.execute(user_stmt)
    user = res.scalar_one()

    # 3. Create or update UserStats in the DB with a stale last_active_date (e.g., 3 days ago)
    stats_stmt = select(UserStats).where(UserStats.user_id == user.id)
    stats = (await db.execute(stats_stmt)).scalar()
    
    three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).date()
    
    if stats:
        stats.current_streak = 5
        stats.best_streak = 10
        stats.last_active_date = three_days_ago
    else:
        stats = UserStats(
            user_id=user.id,
            total_solved=0,
            easy_solved=0,
            medium_solved=0,
            hard_solved=0,
            total_score=0,
            current_streak=5,
            best_streak=10,
            last_active_date=three_days_ago
        )
        db.add(stats)
    
    await db.commit()

    # 4. Fetch the stats via the endpoint and check that the current_streak returned is 0
    resp_stats = await client.get("/api/v1/users/me/stats", headers=auth)
    assert resp_stats.status_code == 200
    data = resp_stats.json()
    assert data["current_streak"] == 0
    assert data["best_streak"] == 10  # Best streak should remain unchanged

    # 5. Now check a scenario where last_active_date is yesterday (diff == 1)
    # The current_streak should NOT be reset to 0 in the response
    stats.last_active_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()
    await db.commit()

    resp_stats_yesterday = await client.get("/api/v1/users/me/stats", headers=auth)
    assert resp_stats_yesterday.status_code == 200
    data_yesterday = resp_stats_yesterday.json()
    assert data_yesterday["current_streak"] == 5

