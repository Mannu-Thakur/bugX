import uuid
import json
from typing import Any, Optional, Dict, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db, AsyncSessionLocal
from app.core.deps import get_current_active_user
from app.core.security import decode_token
from app.models.battle import Battle
from app.models.battle_player import BattlePlayer
from app.models.user import User
from app.repositories.user_repo import UserRepo

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, battle_id: str, websocket: WebSocket):
        await websocket.accept()
        if battle_id not in self.active_connections:
            self.active_connections[battle_id] = []
        self.active_connections[battle_id].append(websocket)

    def disconnect(self, battle_id: str, websocket: WebSocket):
        if battle_id in self.active_connections:
            if websocket in self.active_connections[battle_id]:
                self.active_connections[battle_id].remove(websocket)
            if not self.active_connections[battle_id]:
                del self.active_connections[battle_id]

    async def broadcast(self, battle_id: str, message: dict):
        if battle_id in self.active_connections:
            for connection in self.active_connections[battle_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()


def _ensure_aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (UTC). SQLite returns naive datetimes."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _player_dict(p: BattlePlayer, now: datetime) -> dict:
    is_active = p.last_active is not None and (now - _ensure_aware(p.last_active)).total_seconds() < 6
    return {
        "player_index": p.player_index,
        "username": p.username,
        "is_active": is_active,
        "score": p.score,
        "solved": p.solved,
        "solved_at": p.solved_at.isoformat() if p.solved_at else None,
        "attempts": p.attempts,
        "code": p.code,
        "lang": p.lang,
    }


# ── Request models ──────────────────────────────────────────────

class BattleCreateRequest(BaseModel):
    max_players: int = Field(default=2, ge=2, le=200)
    player_usernames: List[str] = []
    time_limit: int = 15
    problem_source: str = "catalog"
    selected_slug: Optional[str] = None
    custom_problem: Optional[Dict[str, Any]] = None


class BattleJoinRequest(BaseModel):
    pass  # Username comes from authenticated user


class BattleUpdateRequest(BaseModel):
    player_index: int
    score: Optional[int] = None
    solved: Optional[bool] = None
    attempts: Optional[int] = None
    code: Optional[str] = None
    lang: Optional[str] = None


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_battle(
    req: BattleCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    import re
    from app.models.problem import Problem, DifficultyEnum
    from app.models.problem_template import ProblemTemplate, ArgStyleEnum
    from app.models.test_case import TestCase
    from app.services.code_wrapper_service import CodeWrapperService

    custom_problem_str = json.dumps(req.custom_problem) if req.custom_problem else None

    # Resolve/Seed problem_id
    problem_id = None
    if req.problem_source == "custom" and req.custom_problem:

        # Unique slug
        slug = f"custom-battle-{uuid.uuid4().hex}"
        title = req.custom_problem.get("title", "Custom Challenge").strip()
        description = req.custom_problem.get("description", "").strip()

        # Detect function name from python template
        python_tpl = req.custom_problem.get("pythonTemplate", "").strip()
        func_match = re.search(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", python_tpl)
        func_name = func_match.group(1) if func_match else "solve"

        params, _ = CodeWrapperService._parse_python_signature(python_tpl, func_name)
        detected_arg_style = ArgStyleEnum.positional if len(params) > 1 else ArgStyleEnum.single

        # Test cases
        test_cases = []
        raw_test_cases = req.custom_problem.get("testCases", [])
        for idx, tc in enumerate(raw_test_cases):
            test_cases.append(TestCase(
                input=tc.get("input", "").strip(),
                expected_output=tc.get("expectedOutput", "").strip(),
                is_sample=True,
                order_index=idx,
                weight=1
            ))

        # Templates
        templates = []
        if python_tpl:
            templates.append(ProblemTemplate(
                language="python",
                template_code=python_tpl,
                function_name=func_name,
                arg_style=detected_arg_style
            ))
        js_tpl = req.custom_problem.get("jsTemplate", "").strip()
        if js_tpl:
            templates.append(ProblemTemplate(
                language="javascript",
                template_code=js_tpl,
                function_name=func_name,
                arg_style=detected_arg_style
            ))
        cpp_tpl = req.custom_problem.get("cppTemplate", "").strip()
        if cpp_tpl:
            templates.append(ProblemTemplate(
                language="cpp",
                template_code=cpp_tpl,
                function_name=func_name,
                arg_style=detected_arg_style
            ))
        java_tpl = req.custom_problem.get("javaTemplate", "").strip()
        if java_tpl:
            templates.append(ProblemTemplate(
                language="java",
                template_code=java_tpl,
                function_name=func_name,
                arg_style=detected_arg_style
            ))

        problem = Problem(
            slug=slug,
            title=title,
            description=description,
            difficulty=DifficultyEnum.MEDIUM,
            time_limit_ms=2000,
            memory_limit_kb=262144,
            score_base=100,
            runtime_bonus_max=20,
            is_published=False,
            templates=templates,
            test_cases=test_cases
        )
        db.add(problem)
        await db.flush()
        problem_id = problem.id

    elif req.problem_source == "catalog" and req.selected_slug:
        stmt = select(Problem).where(Problem.slug == req.selected_slug)
        result = await db.execute(stmt)
        problem = result.scalars().first()
        if problem:
            problem_id = problem.id
        else:
            raise HTTPException(status_code=400, detail="Catalog problem not found")

    battle = Battle(
        host_username=current_user.username,
        max_players=req.max_players,
        time_limit=req.time_limit,
        problem_source=req.problem_source,
        selected_slug=req.selected_slug,
        custom_problem=custom_problem_str,
        problem_id=problem_id,
        status="pending",
    )
    db.add(battle)
    await db.flush()  # get battle.id

    # Build unique ordered player list – host is always index 0
    seen = {current_user.username}
    usernames = [current_user.username]
    for u in req.player_usernames:
        if u not in seen:
            seen.add(u)
            usernames.append(u)
    usernames = usernames[:req.max_players]

    for idx, uname in enumerate(usernames):
        db.add(BattlePlayer(battle_id=battle.id, player_index=idx, username=uname))

    await db.commit()
    await db.refresh(battle)
    return {"id": str(battle.id)}


@router.post("/{battle_id}/join")
async def join_battle(
    battle_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    stmt = select(Battle).where(Battle.id == battle_id)
    result = await db.execute(stmt)
    battle = result.scalars().first()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")

    # Check if already joined
    existing = await db.execute(
        select(BattlePlayer).where(
            BattlePlayer.battle_id == battle_id,
            BattlePlayer.username == current_user.username,
        )
    )
    existing_player = existing.scalars().first()
    if existing_player:
        return {"player_index": existing_player.player_index}

    # Count current players
    count_result = await db.execute(
        select(BattlePlayer).where(BattlePlayer.battle_id == battle_id)
    )
    current_players = count_result.scalars().all()

    if len(current_players) >= battle.max_players:
        raise HTTPException(status_code=400, detail="Battle is full")
    if battle.status != "pending":
        raise HTTPException(status_code=400, detail="Battle already started")

    next_index = max(p.player_index for p in current_players) + 1 if current_players else 0
    player = BattlePlayer(
        battle_id=battle_id,
        player_index=next_index,
        username=current_user.username,
    )
    db.add(player)
    await db.commit()

    # Broadcast join event
    await manager.broadcast(str(battle_id), {
        "type": "player_joined",
        "player_index": next_index,
        "username": current_user.username,
    })

    return {"player_index": next_index}


@router.get("/{battle_id}")
async def get_battle(
    battle_id: uuid.UUID,
    player_index: Optional[int] = Query(None, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    stmt = select(Battle).where(Battle.id == battle_id)
    result = await db.execute(stmt)
    battle = result.scalars().first()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")

    await db.refresh(battle, ["players"])

    # Spectator protection
    is_host = battle.host_username == current_user.username
    is_player = any(p.username == current_user.username for p in battle.players)
    if not (is_host or is_player):
        # Allow viewing pending battles so players can join
        if battle.status != "pending":
            raise HTTPException(status_code=403, detail="Forbidden: You are not a participant in this battle")

    now = datetime.now(timezone.utc)

    # Mark requesting player active
    if player_index is not None:
        for p in battle.players:
            if p.player_index == player_index:
                p.is_active = True
                p.last_active = now
                break

    # Auto-start: all joined players recently active AND at least 2 players
    if battle.status == "pending" and len(battle.players) >= 2:
        all_recent = all(
            p.last_active is not None and (now - _ensure_aware(p.last_active)).total_seconds() < 10
            for p in battle.players
        )
        if all_recent:
            battle.status = "active"
            battle.start_time = now

    # Auto-finish: timer expired
    if battle.status == "active" and battle.start_time:
        elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
        if elapsed >= battle.time_limit * 60:
            battle.status = "finished"

    await db.commit()
    await db.refresh(battle)

    # Build response
    custom_prob_parsed = None
    if battle.custom_problem:
        try:
            custom_prob_parsed = json.loads(battle.custom_problem)
        except Exception:
            pass

    time_left = None
    if battle.status == "active" and battle.start_time:
        elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
        time_left = max(0, int(battle.time_limit * 60 - elapsed))

    return {
        "id": str(battle.id),
        "host_username": battle.host_username,
        "max_players": battle.max_players,
        "status": battle.status,
        "time_limit": battle.time_limit,
        "time_left": time_left,
        "problem_source": battle.problem_source,
        "selected_slug": battle.selected_slug,
        "custom_problem": custom_prob_parsed,
        "problem_id": str(battle.problem_id) if battle.problem_id else None,
        "start_time": battle.start_time.isoformat() if battle.start_time else None,
        "created_at": battle.created_at.isoformat(),
        "players": [_player_dict(p, now) for p in battle.players],
    }


@router.post("/{battle_id}/start")
async def start_battle(
    battle_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    stmt = select(Battle).where(Battle.id == battle_id)
    result = await db.execute(stmt)
    battle = result.scalars().first()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    if battle.host_username != current_user.username:
        raise HTTPException(status_code=403, detail="Only the host can start the battle")
    if battle.status != "pending":
        raise HTTPException(status_code=400, detail="Battle already started or finished")

    now = datetime.now(timezone.utc)
    battle.status = "active"
    battle.start_time = now
    await db.commit()

    await manager.broadcast(str(battle_id), {
        "type": "battle_started",
        "start_time": now.isoformat(),
    })

    return {"status": "active", "start_time": now.isoformat()}


@router.post("/{battle_id}/update")
async def update_battle(
    battle_id: uuid.UUID,
    req: BattleUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    # Verify the requesting user owns this player_index
    stmt = select(BattlePlayer).where(
        BattlePlayer.battle_id == battle_id,
        BattlePlayer.player_index == req.player_index,
    )
    result = await db.execute(stmt)
    player = result.scalars().first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found in this battle")
    if player.username != current_user.username:
        raise HTTPException(status_code=403, detail="Cannot update another player's state")

    now = datetime.now(timezone.utc)
    player.last_active = now
    player.is_active = True

    # Ignore score and solved overrides from client (calculated on backend only)
    if req.attempts is not None:
        player.attempts = req.attempts
    if req.code is not None:
        player.code = req.code
    if req.lang is not None:
        player.lang = req.lang

    # Check if all players solved -> finish (fresh load to avoid stale data)
    battle_stmt = (
        select(Battle)
        .where(Battle.id == battle_id)
        .options(selectinload(Battle.players))
    )
    battle_result = await db.execute(battle_stmt)
    battle = battle_result.scalars().first()
    if battle:
        all_solved = all(p.solved for p in battle.players)
        if all_solved and battle.status != "finished":
            battle.status = "finished"

    await db.commit()
    return {"status": "ok"}


async def _authenticate_ws_token(token: str) -> Optional[User]:
    """Validate a JWT token and return the User, or None."""
    from jose import JWTError
    try:
        payload = decode_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        return None

    async with AsyncSessionLocal() as db:
        repo = UserRepo(db)
        user = await repo.get_by_id(user_id)
        if user and user.is_active:
            return user
    return None


@router.websocket("/ws/{battle_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    battle_id: str,
    token: Optional[str] = Query(None),
    player_index: Optional[int] = Query(None, ge=0),
):
    # Authenticate the WebSocket connection
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    user = await _authenticate_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    try:
        battle_uuid = uuid.UUID(battle_id)
    except ValueError:
        await websocket.close(code=4004, reason="Invalid battle ID format")
        return

    # Spectator protection on connect
    async with AsyncSessionLocal() as db:
        stmt = select(BattlePlayer).where(
            BattlePlayer.battle_id == battle_uuid,
            BattlePlayer.username == user.username
        )
        res = await db.execute(stmt)
        player = res.scalars().first()
        if not player:
            await websocket.close(code=4003, reason="Not a participant in this battle")
            return

    await manager.connect(battle_id, websocket)
    try:
        await manager.broadcast(battle_id, {
            "type": "connect_status",
            "player_index": player_index,
            "active": True,
        })

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "update":
                p_idx = data.get("player_index")

                async with AsyncSessionLocal() as db:
                    # Verify the authenticated user owns this player_index
                    verify_stmt = select(BattlePlayer).where(
                        BattlePlayer.battle_id == battle_uuid,
                        BattlePlayer.player_index == p_idx,
                    )
                    verify_result = await db.execute(verify_stmt)
                    verify_player = verify_result.scalars().first()
                    if not verify_player or verify_player.username != user.username:
                        await websocket.send_json({"type": "error", "message": "Cannot update another player"})
                        continue

                    # Ignore score and solved from client WebSocket message (calculated on backend)
                    attempts = data.get("attempts")
                    code = data.get("code")
                    lang = data.get("lang")

                    stmt = select(BattlePlayer).where(
                        BattlePlayer.battle_id == battle_uuid,
                        BattlePlayer.player_index == p_idx,
                    )
                    result = await db.execute(stmt)
                    player = result.scalars().first()
                    if player:
                        now = datetime.now(timezone.utc)
                        player.last_active = now
                        player.is_active = True
                        if attempts is not None:
                            player.attempts = attempts
                        if code is not None:
                            player.code = code
                        if lang is not None:
                            player.lang = lang

                        # Check all-solved finish condition (fresh load)
                        battle_stmt = (
                            select(Battle)
                            .where(Battle.id == battle_uuid)
                            .options(selectinload(Battle.players))
                        )
                        battle_result = await db.execute(battle_stmt)
                        battle = battle_result.scalars().first()
                        if battle:
                            all_solved = all(p.solved for p in battle.players)
                            if all_solved and battle.status != "finished":
                                battle.status = "finished"

                        await db.commit()
                        db_score = player.score
                        db_solved = player.solved

                await manager.broadcast(battle_id, {
                    "type": "state_update",
                    "player_index": p_idx,
                    "score": db_score,
                    "solved": db_solved,
                    "attempts": attempts if attempts is not None else (player.attempts if player else 0),
                    "code": code,
                    "lang": lang,
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(battle_id, websocket)
        await manager.broadcast(battle_id, {
            "type": "connect_status",
            "player_index": player_index,
            "active": False,
        })
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        manager.disconnect(battle_id, websocket)


async def start_redis_listener(redis_url: str):
    """Listens to 'battle_events' Redis channel and broadcasts messages to active WebSocket clients."""
    print("[RedisListener] Starting redis battle_events pubsub listener...")
    import redis.asyncio as aioredis
    import json
    r = aioredis.from_url(redis_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe("battle_events")
    try:
        while True:
            # We read message with a timeout of 1.0 second to allow cancellation
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                try:
                    data = json.loads(message["data"])
                    b_id = data.get("battle_id")
                    if b_id:
                        # Broadcast this message to all active WebSocket clients for this battle
                        await manager.broadcast(str(b_id), data)
                except Exception as e:
                    print(f"[RedisListener] Error parsing or broadcasting message: {e}")
            await asyncio.sleep(0.1)
    except asyncio.CancelledError:
        print("[RedisListener] Redis listener task cancelled.")
    finally:
        await pubsub.unsubscribe("battle_events")
        await r.close()
