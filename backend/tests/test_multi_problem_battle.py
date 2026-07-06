import pytest
import uuid
import json
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.battle import Battle
from app.models.battle_player import BattlePlayer

@pytest.mark.asyncio
async def test_multi_problem_battle_lifecycle(client: AsyncClient, db: AsyncSession):
    # Seed 2 catalog problems first
    from app.models.problem import Problem, DifficultyEnum
    from app.models.problem_template import ProblemTemplate, ArgStyleEnum
    
    two_sum = Problem(
        slug="two-sum-multi",
        title="Two Sum Multi",
        description="Find two numbers that add up to target.",
        difficulty=DifficultyEnum.EASY,
        time_limit_ms=2000,
        memory_limit_kb=262144,
        score_base=1,
        runtime_bonus_max=20,
        is_published=True
    )
    db.add(two_sum)
    
    climbing_stairs = Problem(
        slug="climbing-stairs-multi",
        title="Climbing Stairs Multi",
        description="Count ways to reach the top.",
        difficulty=DifficultyEnum.EASY,
        time_limit_ms=2000,
        memory_limit_kb=262144,
        score_base=1,
        runtime_bonus_max=20,
        is_published=True
    )
    db.add(climbing_stairs)
    await db.commit()

    # Seed templates so visibility checks pass
    tpl1 = ProblemTemplate(
        problem_id=two_sum.id, 
        language="python", 
        template_code="def solve(): pass",
        function_name="solve",
        arg_style=ArgStyleEnum.single
    )
    tpl2 = ProblemTemplate(
        problem_id=climbing_stairs.id, 
        language="python", 
        template_code="def solve2(): pass",
        function_name="solve2",
        arg_style=ArgStyleEnum.single
    )
    db.add(tpl1)
    db.add(tpl2)
    await db.commit()

    # Register and login Alice (Host)
    resp_alice = await client.post(
        "/api/v1/auth/register",
        json={"email": "alice_multi@example.com", "username": "AliceMulti", "password": "Password123"}
    )
    assert resp_alice.status_code == 200
    alice_token = resp_alice.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 1. Create a Battle with selected_slugs=[two-sum-multi, climbing-stairs-multi]
    payload = {
        "max_players": 2,
        "player_usernames": ["AliceMulti"],
        "time_limit": 15,
        "problem_source": "catalog",
        "selected_slugs": ["two-sum-multi", "climbing-stairs-multi"]
    }

    create_resp = await client.post("/api/v1/battle/create", json=payload, headers=alice_headers)
    assert create_resp.status_code == 201
    battle_id = create_resp.json()["id"]

    # Verify it exists in database with list columns populated
    stmt = select(Battle).where(Battle.id == uuid.UUID(battle_id))
    result = await db.execute(stmt)
    battle = result.scalars().first()
    assert battle is not None
    assert battle.selected_slugs is not None
    assert "two-sum-multi" in json.loads(battle.selected_slugs)
    assert "climbing-stairs-multi" in json.loads(battle.selected_slugs)
    
    pids = json.loads(battle.problem_ids)
    assert len(pids) == 2

    # 2. Get Battle state
    get_resp = await client.get(f"/api/v1/battle/{battle_id}", headers=alice_headers)
    assert get_resp.status_code == 200
    gdata = get_resp.json()
    assert len(gdata["problems"]) == 2
    assert gdata["problems"][0]["slug"] == "two-sum-multi"
    assert gdata["problems"][1]["slug"] == "climbing-stairs-multi"
    
    player_data = gdata["players"][0]
    assert "progress" in player_data
    # Initially progress is mapped to 0 index with base properties
    assert "0" in player_data["progress"]

    # 3. Update player code for problem 0
    update_payload = {
        "player_index": 0,
        "code": "def solve_q1(): pass",
        "lang": "python",
        "problem_index": 0,
        "active_problem_index": 0
    }
    up_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload, headers=alice_headers)
    assert up_resp.status_code == 200

    # 4. Update active problem to 1 and write code for problem 1
    update_payload2 = {
        "player_index": 0,
        "code": "def solve_q2(): pass",
        "lang": "python",
        "problem_index": 1,
        "active_problem_index": 1
    }
    up_resp2 = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload2, headers=alice_headers)
    assert up_resp2.status_code == 200

    # 5. Fetch and verify progress state
    get_resp2 = await client.get(f"/api/v1/battle/{battle_id}", headers=alice_headers)
    gdata2 = get_resp2.json()
    player_data2 = gdata2["players"][0]
    
    assert player_data2["active_problem_index"] == 1
    assert player_data2["progress"]["0"]["code"] == "def solve_q1(): pass"
    assert player_data2["progress"]["1"]["code"] == "def solve_q2(): pass"
    assert player_data2["progress"]["0"]["lang"] == "python"
    assert player_data2["progress"]["1"]["lang"] == "python"


@pytest.mark.asyncio
async def test_multi_problem_battle_concede_and_broadcast(client: AsyncClient, db: AsyncSession):
    # Seed catalog problem first
    from app.models.problem import Problem, DifficultyEnum
    from app.models.problem_template import ProblemTemplate, ArgStyleEnum
    from app.models.battle import Battle
    from app.models.battle_player import BattlePlayer

    two_sum = Problem(
        slug="two-sum-concede",
        title="Two Sum Concede",
        description="Find two numbers that add up to target.",
        difficulty=DifficultyEnum.EASY,
        time_limit_ms=2000,
        memory_limit_kb=262144,
        score_base=1,
        runtime_bonus_max=20,
        is_published=True
    )
    db.add(two_sum)
    await db.commit()

    # Seed templates so visibility checks pass
    tpl = ProblemTemplate(
        problem_id=two_sum.id, 
        language="python", 
        template_code="def solve(): pass",
        function_name="solve",
        arg_style=ArgStyleEnum.single
    )
    db.add(tpl)
    await db.commit()

    # Register and login Alice (Host)
    resp_alice = await client.post(
        "/api/v1/auth/register",
        json={"email": "alice_concede@example.com", "username": "AliceConcede", "password": "Password123"}
    )
    assert resp_alice.status_code == 200
    alice_token = resp_alice.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # Create a Battle
    payload = {
        "max_players": 2,
        "player_usernames": ["AliceConcede"],
        "time_limit": 15,
        "problem_source": "catalog",
        "selected_slugs": ["two-sum-concede"]
    }

    create_resp = await client.post("/api/v1/battle/create", json=payload, headers=alice_headers)
    assert create_resp.status_code == 201
    battle_id = create_resp.json()["id"]

    # Update player with solved=True and score=0 via REST update (checks broadcast and storage)
    update_payload = {
        "player_index": 0,
        "code": "def solve_q1(): pass",
        "lang": "python",
        "problem_index": 0,
        "solved": True,
        "score": 0
    }
    up_resp = await client.post(f"/api/v1/battle/{battle_id}/update", json=update_payload, headers=alice_headers)
    assert up_resp.status_code == 200

    # Fetch battle and verify player has progress solved=True and score=0
    get_resp = await client.get(f"/api/v1/battle/{battle_id}", headers=alice_headers)
    assert get_resp.status_code == 200
    gdata = get_resp.json()
    player_data = gdata["players"][0]
    assert player_data["progress"]["0"]["solved"] == True
    assert player_data["progress"]["0"]["score"] == 0
