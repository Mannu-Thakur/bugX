import uuid
import json
from typing import Any, Optional, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.battle import Battle

router = APIRouter()


def _ensure_aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (UTC). SQLite returns naive datetimes."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class BattleCreateRequest(BaseModel):
    player1_username: str
    player2_username: str
    time_limit: int
    problem_source: str
    selected_slug: Optional[str] = None
    custom_problem: Optional[Dict[str, Any]] = None

class BattleUpdateRequest(BaseModel):
    player: int  # 1 or 2
    score: Optional[int] = None
    solved: Optional[bool] = None
    attempts: Optional[int] = None
    code: Optional[str] = None
    lang: Optional[str] = None

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_battle(req: BattleCreateRequest, db: AsyncSession = Depends(get_db)) -> Any:
    custom_problem_str = None
    if req.custom_problem:
        custom_problem_str = json.dumps(req.custom_problem)
        
    battle = Battle(
        player1_username=req.player1_username,
        player2_username=req.player2_username,
        time_limit=req.time_limit,
        problem_source=req.problem_source,
        selected_slug=req.selected_slug,
        custom_problem=custom_problem_str,
        status="pending"
    )
    db.add(battle)
    await db.commit()
    await db.refresh(battle)
    return {"id": str(battle.id)}

@router.get("/{battle_id}")
async def get_battle(
    battle_id: uuid.UUID,
    player: Optional[int] = Query(None, ge=1, le=2),
    db: AsyncSession = Depends(get_db)
) -> Any:
    stmt = select(Battle).where(Battle.id == battle_id)
    result = await db.execute(stmt)
    battle = result.scalars().first()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
        
    now = datetime.now(timezone.utc)
    if player == 1:
        battle.player1_active = True
        battle.player1_last_active = now
    elif player == 2:
        battle.player2_active = True
        battle.player2_last_active = now
        
    # Sync status to active when both players are connected and active
    if battle.status == "pending":
        if battle.player1_last_active and battle.player2_last_active:
            p1_recent = (now - _ensure_aware(battle.player1_last_active)).total_seconds() < 10
            p2_recent = (now - _ensure_aware(battle.player2_last_active)).total_seconds() < 10
            if p1_recent and p2_recent:
                battle.status = "active"
                battle.start_time = now
                
    await db.commit()
    await db.refresh(battle)
    
    # Calculate active status flag based on activity in the last 6 seconds
    p1_active = battle.player1_last_active is not None and (now - _ensure_aware(battle.player1_last_active)).total_seconds() < 6
    p2_active = battle.player2_last_active is not None and (now - _ensure_aware(battle.player2_last_active)).total_seconds() < 6
    
    # Parse custom problem if it exists
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
        "player1_username": battle.player1_username,
        "player2_username": battle.player2_username,
        "player1_active": p1_active,
        "player2_active": p2_active,
        "time_limit": battle.time_limit,
        "problem_source": battle.problem_source,
        "selected_slug": battle.selected_slug,
        "custom_problem": custom_prob_parsed,
        "p1_score": battle.p1_score,
        "p2_score": battle.p2_score,
        "p1_solved": battle.p1_solved,
        "p2_solved": battle.p2_solved,
        "p1_attempts": battle.p1_attempts,
        "p2_attempts": battle.p2_attempts,
        "p1_code": battle.p1_code,
        "p2_code": battle.p2_code,
        "p1_lang": battle.p1_lang,
        "p2_lang": battle.p2_lang,
        "status": battle.status,
        "start_time": battle.start_time.isoformat() if battle.start_time else None,
        "time_left": time_left,
        "created_at": battle.created_at.isoformat()
    }

@router.post("/{battle_id}/update")
async def update_battle(
    battle_id: uuid.UUID,
    req: BattleUpdateRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    stmt = select(Battle).where(Battle.id == battle_id)
    result = await db.execute(stmt)
    battle = result.scalars().first()
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
        
    now = datetime.now(timezone.utc)
    if req.player == 1:
        battle.player1_last_active = now
        battle.player1_active = True
        if req.score is not None:
            battle.p1_score = req.score
        if req.solved is not None:
            battle.p1_solved = req.solved
        if req.attempts is not None:
            battle.p1_attempts = req.attempts
        if req.code is not None:
            battle.p1_code = req.code
        if req.lang is not None:
            battle.p1_lang = req.lang
    elif req.player == 2:
        battle.player2_last_active = now
        battle.player2_active = True
        if req.score is not None:
            battle.p2_score = req.score
        if req.solved is not None:
            battle.p2_solved = req.solved
        if req.attempts is not None:
            battle.p2_attempts = req.attempts
        if req.code is not None:
            battle.p2_code = req.code
        if req.lang is not None:
            battle.p2_lang = req.lang
            
    # Auto finish when both solved
    if battle.p1_solved and battle.p2_solved:
        battle.status = "finished"
        
    await db.commit()
    await db.refresh(battle)
    return {"status": "ok"}
