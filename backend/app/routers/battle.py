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
    custom_problem_str = json.dumps(req.custom_problem) if req.custom_problem else None

    battle = Battle(
        host_username=current_user.username,
        max_players=req.max_players,
        time_limit=req.time_limit,
        problem_source=req.problem_source,
        selected_slug=req.selected_slug,
        custom_problem=custom_problem_str,
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

    if req.score is not None:
        player.score = req.score
    if req.solved is not None:
        player.solved = req.solved
        if req.solved and not player.solved_at:
            player.solved_at = now
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
        if all_solved:
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
                        BattlePlayer.battle_id == uuid.UUID(battle_id),
                        BattlePlayer.player_index == p_idx,
                    )
                    verify_result = await db.execute(verify_stmt)
                    verify_player = verify_result.scalars().first()
                    if not verify_player or verify_player.username != user.username:
                        await websocket.send_json({"type": "error", "message": "Cannot update another player"})
                        continue

                    score = data.get("score")
                    solved = data.get("solved")
                    attempts = data.get("attempts")
                    code = data.get("code")
                    lang = data.get("lang")

                    stmt = select(BattlePlayer).where(
                        BattlePlayer.battle_id == uuid.UUID(battle_id),
                        BattlePlayer.player_index == p_idx,
                    )
                    result = await db.execute(stmt)
                    player = result.scalars().first()
                    if player:
                        now = datetime.now(timezone.utc)
                        player.last_active = now
                        player.is_active = True
                        if score is not None:
                            player.score = score
                        if solved is not None:
                            player.solved = solved
                            if solved and not player.solved_at:
                                player.solved_at = now
                        if attempts is not None:
                            player.attempts = attempts
                        if code is not None:
                            player.code = code
                        if lang is not None:
                            player.lang = lang

                        # Check all-solved finish condition (fresh load)
                        battle_stmt = (
                            select(Battle)
                            .where(Battle.id == uuid.UUID(battle_id))
                            .options(selectinload(Battle.players))
                        )
                        battle_result = await db.execute(battle_stmt)
                        battle = battle_result.scalars().first()
                        if battle:
                            all_solved = all(p.solved for p in battle.players)
                            if all_solved:
                                battle.status = "finished"

                        await db.commit()

                await manager.broadcast(battle_id, {
                    "type": "state_update",
                    "player_index": p_idx,
                    "score": score,
                    "solved": solved,
                    "attempts": attempts,
                    "code": code,
                    "lang": lang,
                })

                if solved:
                    await manager.broadcast(battle_id, {
                        "type": "win_event",
                        "winner_index": p_idx,
                        "score": score,
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
