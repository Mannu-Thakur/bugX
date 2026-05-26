import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.battle import Battle

@pytest.mark.asyncio
async def test_battle_lifecycle(client: AsyncClient, db: AsyncSession):
    # 1. Create a Battle (host sets it up)
    payload = {
        "player1_username": "Alice",
        "player2_username": "Bob",
        "time_limit": 15,
        "problem_source": "catalog",
        "selected_slug": "two-sum",
        "custom_problem": None
    }
    
    create_resp = await client.post("/api/v1/battle/create", json=payload)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert "id" in data
    battle_id = data["id"]
    
    # Verify it exists in database
    stmt = select(Battle).where(Battle.id == uuid.UUID(battle_id))
    result = await db.execute(stmt)
    battle = result.scalars().first()
    assert battle is not None
    assert battle.player1_username == "Alice"
    assert battle.player2_username == "Bob"
    assert battle.status == "pending"

    # 2. Get Battle state as Player 1 (Host connects)
    get1_resp = await client.get(f"/api/v1/battle/{battle_id}?player=1")
    assert get1_resp.status_code == 200
    gdata1 = get1_resp.json()
    assert gdata1["player1_active"] is True
    assert gdata1["player2_active"] is False
    assert gdata1["status"] == "pending"

    # 3. Get Battle state as Player 2 (Opponent joins / connects)
    get2_resp = await client.get(f"/api/v1/battle/{battle_id}?player=2")
    assert get2_resp.status_code == 200
    gdata2 = get2_resp.json()
    assert gdata2["player2_active"] is True
    # Now because both players have connected, let's verify if the status automatically changes to active
    # We need to refresh or make a third call to confirm active status transition
    get3_resp = await client.get(f"/api/v1/battle/{battle_id}?player=1")
    gdata3 = get3_resp.json()
    assert gdata3["status"] == "active"
    assert gdata3["start_time"] is not None

    # 4. Update progress - Player 1 updates score and solved status
    update_payload = {
        "player": 1,
        "score": 150,
        "solved": True,
        "attempts": 2,
        "code": "const solve = () => {};",
        "lang": "javascript"
    }
    update1_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload)
    assert update1_resp.status_code == 200
    
    # Check that player 1 is marked solved but battle is not finished yet
    get4_resp = await client.get(f"/api/v1/battle/{battle_id}")
    gdata4 = get4_resp.json()
    assert gdata4["p1_score"] == 150
    assert gdata4["p1_solved"] is True
    assert gdata4["p1_attempts"] == 2
    assert gdata4["status"] == "active"  # Active because player 2 hasn't solved yet

    # 5. Player 2 updates progress and solves the problem
    update_payload2 = {
        "player": 2,
        "score": 200,
        "solved": True,
        "attempts": 1,
        "code": "def solve(): pass",
        "lang": "python"
    }
    update2_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload2)
    assert update2_resp.status_code == 200

    # 6. Verify battle state is now finished (auto-finished when both solved)
    get5_resp = await client.get(f"/api/v1/battle/{battle_id}")
    gdata5 = get5_resp.json()
    assert gdata5["p2_score"] == 200
    assert gdata5["p2_solved"] is True
    assert gdata5["status"] == "finished"

@pytest.mark.asyncio
async def test_battle_not_found(client: AsyncClient):
    random_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/battle/{random_id}")
    assert resp.status_code == 404
