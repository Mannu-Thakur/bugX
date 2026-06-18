import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.battle import Battle
from app.models.battle_player import BattlePlayer

@pytest.mark.asyncio
async def test_battle_lifecycle(client: AsyncClient, db: AsyncSession):
    # Seed a "two-sum" catalog problem first
    from app.models.problem import Problem, DifficultyEnum
    two_sum = Problem(
        slug="two-sum",
        title="Two Sum",
        description="Find two numbers that add up to target.",
        difficulty=DifficultyEnum.EASY,
        time_limit_ms=2000,
        memory_limit_kb=262144,
        score_base=100,
        runtime_bonus_max=20,
        is_published=False
    )
    db.add(two_sum)
    await db.commit()

    # Register and login Alice (Host)
    resp_alice = await client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "username": "Alice", "password": "Password123"}
    )
    assert resp_alice.status_code == 200
    alice_token = resp_alice.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # Register and login Bob
    resp_bob = await client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "username": "Bob", "password": "Password123"}
    )
    assert resp_bob.status_code == 200
    bob_token = resp_bob.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # Register and login Charlie
    resp_charlie = await client.post(
        "/api/v1/auth/register",
        json={"email": "charlie@example.com", "username": "Charlie", "password": "Password123"}
    )
    assert resp_charlie.status_code == 200
    charlie_token = resp_charlie.json()["access_token"]
    charlie_headers = {"Authorization": f"Bearer {charlie_token}"}

    # 1. Create a Battle (host sets it up with 3 max players, host + another player name)
    payload = {
        "host_username": "Alice",
        "max_players": 3,
        "player_usernames": ["Alice", "Bob"],
        "time_limit": 15,
        "problem_source": "catalog",
        "selected_slug": "two-sum",
        "custom_problem": None
    }

    create_resp = await client.post("/api/v1/battle/create", json=payload, headers=alice_headers)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert "id" in data
    battle_id = data["id"]

    # Verify it exists in database
    stmt = select(Battle).where(Battle.id == uuid.UUID(battle_id))
    result = await db.execute(stmt)
    battle = result.scalars().first()
    assert battle is not None
    assert battle.host_username == "Alice"
    assert battle.max_players == 3
    assert battle.status == "pending"

    # Check that players relationship has Alice (index 0) and Bob (index 1)
    players_stmt = select(BattlePlayer).where(BattlePlayer.battle_id == uuid.UUID(battle_id)).order_by(BattlePlayer.player_index)
    players_res = await db.execute(players_stmt)
    players = players_res.scalars().all()
    assert len(players) == 2
    assert players[0].username == "Alice"
    assert players[0].player_index == 0
    assert players[1].username == "Bob"
    assert players[1].player_index == 1

    # 2. Get Battle state as Player index 0 (Host connects)
    get1_resp = await client.get(f"/api/v1/battle/{battle_id}?player_index=0", headers=alice_headers)
    assert get1_resp.status_code == 200
    gdata1 = get1_resp.json()
    assert len(gdata1["players"]) == 2
    assert gdata1["players"][0]["is_active"] is True
    assert gdata1["players"][1]["is_active"] is False
    assert gdata1["status"] == "pending"

    # 3. Third player joins
    join_resp = await client.post(f"/api/v1/battle/{battle_id}/join", headers=charlie_headers)
    assert join_resp.status_code == 200
    jdata = join_resp.json()
    assert jdata["player_index"] == 2

    # Get Battle state as Player 2 (Charlie)
    get2_resp = await client.get(f"/api/v1/battle/{battle_id}?player_index=2", headers=charlie_headers)
    assert get2_resp.status_code == 200
    gdata2 = get2_resp.json()
    assert len(gdata2["players"]) == 3
    assert gdata2["players"][2]["is_active"] is True
    assert gdata2["players"][2]["username"] == "Charlie"

    # Let's force-start or let it auto-start by making everyone active.
    # We can also test the start endpoint:
    start_resp = await client.post(f"/api/v1/battle/{battle_id}/start", headers=alice_headers)
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "active"

    # Get state to verify active status
    get3_resp = await client.get(f"/api/v1/battle/{battle_id}", headers=alice_headers)
    gdata3 = get3_resp.json()
    assert gdata3["status"] == "active"
    assert gdata3["start_time"] is not None

    # 4. Update progress - Player 0 (Host) updates score and solved status
    update_payload = {
        "player_index": 0,
        "score": 150,
        "solved": True,
        "attempts": 2,
        "code": "const solve = () => {};",
        "lang": "javascript"
    }
    update1_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload, headers=alice_headers)
    assert update1_resp.status_code == 200

    # Simulate backend scoring service callback for Player 0
    p0_stmt = select(BattlePlayer).where(BattlePlayer.battle_id == uuid.UUID(battle_id), BattlePlayer.player_index == 0)
    p0 = (await db.execute(p0_stmt)).scalars().first()
    p0.score = 150
    p0.solved = True
    from datetime import datetime, timezone
    p0.solved_at = datetime.now(timezone.utc)
    db.add(p0)
    await db.commit()

    # Check that player 0 is marked solved but battle is not finished yet
    get4_resp = await client.get(f"/api/v1/battle/{battle_id}", headers=alice_headers)
    gdata4 = get4_resp.json()
    assert gdata4["players"][0]["score"] == 150
    assert gdata4["players"][0]["solved"] is True
    assert gdata4["players"][0]["attempts"] == 2
    assert gdata4["status"] == "active"  # Active because other players haven't solved yet

    # 5. Player 1 updates progress and solves the problem
    update_payload1 = {
        "player_index": 1,
        "score": 200,
        "solved": True,
        "attempts": 1,
        "code": "def solve(): pass",
        "lang": "python"
    }
    update2_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload1, headers=bob_headers)
    assert update2_resp.status_code == 200

    # Simulate backend scoring service callback for Player 1
    p1_stmt = select(BattlePlayer).where(BattlePlayer.battle_id == uuid.UUID(battle_id), BattlePlayer.player_index == 1)
    p1 = (await db.execute(p1_stmt)).scalars().first()
    p1.score = 200
    p1.solved = True
    p1.solved_at = datetime.now(timezone.utc)
    db.add(p1)
    await db.commit()

    # 6. Player 2 updates progress and solves the problem
    update_payload2 = {
        "player_index": 2,
        "score": 100,
        "solved": True,
        "attempts": 3,
        "code": "int solve() {}",
        "lang": "cpp"
    }
    update3_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload2, headers=charlie_headers)
    assert update3_resp.status_code == 200

    # Simulate backend scoring service callback for Player 2
    p2_stmt = select(BattlePlayer).where(BattlePlayer.battle_id == uuid.UUID(battle_id), BattlePlayer.player_index == 2)
    p2 = (await db.execute(p2_stmt)).scalars().first()
    p2.score = 100
    p2.solved = True
    p2.solved_at = datetime.now(timezone.utc)
    db.add(p2)

    # Force battle to finished (simulating last player solving)
    stmt_b = select(Battle).where(Battle.id == uuid.UUID(battle_id))
    b_obj = (await db.execute(stmt_b)).scalars().first()
    b_obj.status = "finished"
    db.add(b_obj)
    await db.commit()

    # 7. Verify battle state is now finished (auto-finished when ALL solved)
    get5_resp = await client.get(f"/api/v1/battle/{battle_id}", headers=alice_headers)
    gdata5 = get5_resp.json()
    assert gdata5["players"][1]["score"] == 200
    assert gdata5["players"][1]["solved"] is True
    assert gdata5["players"][2]["score"] == 100
    assert gdata5["players"][2]["solved"] is True
    assert gdata5["status"] == "finished"

@pytest.mark.asyncio
async def test_battle_not_found(client: AsyncClient):
    # Register and login Alice
    resp_alice = await client.post(
        "/api/v1/auth/register",
        json={"email": "alice_nf@example.com", "username": "AliceNF", "password": "Password123"}
    )
    assert resp_alice.status_code == 200
    alice_token = resp_alice.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    random_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/battle/{random_id}", headers=alice_headers)
    assert resp.status_code == 404
