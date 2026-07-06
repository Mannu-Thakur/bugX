import uuid
import json
import asyncio
import logging
from typing import Any, Optional, Dict, List

logger = logging.getLogger(__name__)
from datetime import datetime, timezone, timedelta
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
from app.models.problem import Problem
from app.models.user import User
from app.repositories.user_repo import UserRepo

router = APIRouter()


class ConnectionManager:
  def __init__(self):
    # Maps battle_id -> {username: WebSocket}
    self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

  async def connect(self, battle_id: str, username: str, websocket: WebSocket):
    # If duplicate connection exists, close it cleanly
    if battle_id in self.active_connections and username in self.active_connections[battle_id]:
      old_ws = self.active_connections[battle_id][username]
      try:
        await old_ws.close(code=4009, reason="Duplicate connection")
      except Exception:
        pass
    
    await websocket.accept()
    if battle_id not in self.active_connections:
      self.active_connections[battle_id] = {}
    self.active_connections[battle_id][username] = websocket

  def disconnect(self, battle_id: str, username: str, websocket: WebSocket):
    if battle_id in self.active_connections:
      if self.active_connections[battle_id].get(username) == websocket:
        del self.active_connections[battle_id][username]
      if not self.active_connections[battle_id]:
        del self.active_connections[battle_id]

  async def broadcast(self, battle_id: str, message: dict):
    if battle_id in self.active_connections:
      for connection in list(self.active_connections[battle_id].values()):
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
  is_active = p.is_active or (p.last_active is not None and (now - _ensure_aware(p.last_active)).total_seconds() < 12)
  progress_dict = {}
  if p.progress:
    try:
      progress_dict = json.loads(p.progress)
    except Exception:
      pass

  if not progress_dict:
    progress_dict["0"] = {
      "code": p.code or "",
      "lang": p.lang or "javascript",
      "solved": p.solved or False,
      "solved_at": p.solved_at.isoformat() if p.solved_at else None,
      "attempts": p.attempts or 0,
      "score": p.score or 0
    }

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
      "progress": progress_dict,
      "active_problem_index": p.active_problem_index,
  }


def _problem_dict(problem) -> Optional[dict]:
  if not problem:
    return None

  import json

  templates = []
  for t in getattr(problem, "templates", []):
    templates.append({
        "language": t.language,
        "template_code": t.template_code,
        "source_code": getattr(t, "source_code", ""),
        "function_name": t.function_name,
    })

  test_cases = []
  for tc in getattr(problem, "test_cases", []):
    if tc.is_sample:
      test_cases.append({
          "id": str(tc.id),
          "input": tc.input,
          "expected_output": tc.expected_output,
          "is_sample": tc.is_sample,
      })

  tags = [{"id": str(tag.id), "name": tag.name} for tag in getattr(problem, "tags", [])]

  hints_list = []
  hints_raw = getattr(problem, "hints", None)
  if hints_raw:
    try:
      hints_list = json.loads(hints_raw) if isinstance(hints_raw, str) else list(hints_raw)
    except Exception:
      hints_list = []

  return {
      "id": str(problem.id),
      "slug": problem.slug,
      "title": problem.title,
      "description": problem.description,
      "difficulty": problem.difficulty.value if hasattr(problem.difficulty, "value") else str(problem.difficulty),
      "time_limit_ms": problem.time_limit_ms,
      "memory_limit_kb": problem.memory_limit_kb,
      "score_base": problem.score_base,
      "templates": templates,
      "sample_test_cases": test_cases,
      "tags": tags,
  }


async def _get_battle_problems(battle: Battle, db: AsyncSession) -> List[Any]:
  pids = []
  if battle.problem_ids:
    try:
      pids = json.loads(battle.problem_ids)
    except Exception:
      pids = []

  if pids:
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Problem)
        .where(Problem.id.in_([uuid.UUID(pid) for pid in pids]))
        .options(
            selectinload(Problem.templates),
            selectinload(Problem.test_cases),
        )
    )
    res = await db.execute(stmt)
    retrieved = res.scalars().all()
    # preserve order of pids
    id_to_prob = {str(p.id): p for p in retrieved}
    return [id_to_prob[pid] for pid in pids if pid in id_to_prob]
  else:
    return [battle.problem] if battle.problem else []


def _room_dict(battle: Battle, now: datetime, problems_list: List[Any], time_left: Optional[int]) -> dict:
  custom_prob_parsed = None
  if battle.custom_problem:
    try:
      custom_prob_parsed = json.loads(battle.custom_problem)
    except Exception:
      pass

  custom_probs_parsed = None
  if battle.custom_problems:
    try:
      custom_probs_parsed = json.loads(battle.custom_problems)
    except Exception:
      pass

  selected_slugs_parsed = None
  if battle.selected_slugs:
    try:
      selected_slugs_parsed = json.loads(battle.selected_slugs)
    except Exception:
      pass

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
      "selected_slugs": selected_slugs_parsed,
      "custom_problems": custom_probs_parsed,
      "problem_ids": json.loads(battle.problem_ids) if battle.problem_ids else None,
      "start_time": battle.start_time.isoformat() if battle.start_time else None,
      "created_at": battle.created_at.isoformat(),
      "players": [_player_dict(p, now) for p in battle.players],
      "problem": _problem_dict(battle.problem),
      "problems": [_problem_dict(p) for p in problems_list],
  }



# ── Request models ──────────────────────────────────────────────

class BattleCreateRequest(BaseModel):
  max_players: int = Field(default=2, ge=2, le=200)
  player_usernames: List[str] = []
  time_limit: int = 15
  problem_source: str = "catalog"
  selected_slug: Optional[str] = None
  custom_problem: Optional[Dict[str, Any]] = None
  selected_slugs: Optional[List[str]] = None
  custom_problems: Optional[List[Dict[str, Any]]] = None


class BattleJoinRequest(BaseModel):
  pass


class BattleUpdateRequest(BaseModel):
  player_index: int
  score: Optional[int] = None
  solved: Optional[bool] = None
  attempts: Optional[int] = None
  code: Optional[str] = None
  lang: Optional[str] = None
  problem_index: Optional[int] = None
  active_problem_index: Optional[int] = None


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

  selected_slugs_list = req.selected_slugs or []
  if not selected_slugs_list and req.selected_slug:
    selected_slugs_list = [req.selected_slug]

  custom_problems_list = req.custom_problems or []
  if not custom_problems_list and req.custom_problem:
    custom_problems_list = [req.custom_problem]

  problem_ids_resolved = []

  if req.problem_source == "custom" and custom_problems_list:
    for cp in custom_problems_list:
      slug = f"custom-battle-{uuid.uuid4().hex}"
      title = cp.get("title", "Custom Challenge").strip()
      description = cp.get("description", "").strip()

      python_tpl = cp.get("pythonTemplate", "").strip()
      func_match = re.search(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", python_tpl)
      func_name = func_match.group(1) if func_match else "solve"

      params, _ = CodeWrapperService._parse_python_signature(python_tpl, func_name)
      detected_arg_style = ArgStyleEnum.positional if len(params) > 1 else ArgStyleEnum.single

      test_cases = []
      raw_test_cases = cp.get("testCases", [])
      for idx, tc in enumerate(raw_test_cases):
        test_cases.append(TestCase(
            input=tc.get("input", "").strip(),
            expected_output=tc.get("expectedOutput", "").strip(),
            is_sample=True,
            order_index=idx,
            weight=1
        ))

      templates = []
      if python_tpl:
        templates.append(ProblemTemplate(
            language="python",
            template_code=python_tpl,
            function_name=func_name,
            arg_style=detected_arg_style
        ))
      js_tpl = cp.get("jsTemplate", "").strip()
      if js_tpl:
        templates.append(ProblemTemplate(
            language="javascript",
            template_code=js_tpl,
            function_name=func_name,
            arg_style=detected_arg_style
        ))
      cpp_tpl = cp.get("cppTemplate", "").strip()
      if cpp_tpl:
        templates.append(ProblemTemplate(
            language="cpp",
            template_code=cpp_tpl,
            function_name=func_name,
            arg_style=detected_arg_style
        ))
      java_tpl = cp.get("javaTemplate", "").strip()
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
          score_base=3,
          runtime_bonus_max=20,
          is_published=False,
          templates=templates,
          test_cases=test_cases
      )
      db.add(problem)
      await db.flush()
      problem_ids_resolved.append(problem.id)

  elif req.problem_source == "catalog" and selected_slugs_list:
    stmt = select(Problem).where(Problem.slug.in_(selected_slugs_list))
    result = await db.execute(stmt)
    db_problems = result.scalars().all()

    slug_to_prob = {p.slug: p for p in db_problems}
    ordered_problems = [slug_to_prob[slug] for slug in selected_slugs_list if slug in slug_to_prob]

    if len(ordered_problems) < len(selected_slugs_list):
      raise HTTPException(status_code=400, detail="One or more catalog problems not found")

    problem_ids_resolved = [p.id for p in ordered_problems]

  # Fallback variables for old database schema fields
  first_slug = selected_slugs_list[0] if selected_slugs_list else None
  first_custom_str = json.dumps(custom_problems_list[0]) if custom_problems_list else None
  first_prob_id = problem_ids_resolved[0] if problem_ids_resolved else None

  battle = Battle(
      host_username=current_user.username,
      max_players=req.max_players,
      time_limit=req.time_limit,
      problem_source=req.problem_source,
      selected_slug=first_slug,
      custom_problem=first_custom_str,
      problem_id=first_prob_id,
      selected_slugs=json.dumps(selected_slugs_list) if selected_slugs_list else None,
      custom_problems=json.dumps(custom_problems_list) if custom_problems_list else None,
      problem_ids=json.dumps([str(pid) for pid in problem_ids_resolved]) if problem_ids_resolved else None,
      status="pending",
  )
  db.add(battle)
  await db.flush()

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

  existing = await db.execute(
      select(BattlePlayer).where(
          BattlePlayer.battle_id == battle_id,
          BattlePlayer.username == current_user.username,
      )
  )
  existing_player = existing.scalars().first()
  if existing_player:
    return {"player_index": existing_player.player_index}

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

  await manager.broadcast(str(battle_id), {
      "type": "player_joined",
      "player_index": next_index,
      "username": current_user.username,
  })

  return {"player_index": next_index}


@router.get("/history")
async def get_battle_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    from app.models.battle import BattleHistory
    import json

    stmt = select(BattleHistory).order_by(BattleHistory.end_time.desc())
    res = await db.execute(stmt)
    histories = res.scalars().all()

    user_history = []
    for h in histories:
        try:
            parts = json.loads(h.participants) if h.participants else []
        except Exception:
            parts = []

        if current_user.username in parts:
            try:
                final_scores = json.loads(h.final_scores) if h.final_scores else {}
            except Exception:
                final_scores = {}
            try:
                problems_solved = json.loads(h.problems_solved) if h.problems_solved else {}
            except Exception:
                problems_solved = {}
            try:
                attempts_dict = json.loads(h.attempts) if h.attempts else {}
            except Exception:
                attempts_dict = {}

            players = []
            for username in parts:
                players.append({
                    "username": username,
                    "score": final_scores.get(username, 0),
                    "solved": problems_solved.get(username, False),
                    "attempts": attempts_dict.get(username, 0)
                })

            user_history.append({
                "id": str(h.battle_id),
                "problemTitle": h.problem_title,
                "players": players,
                "winner": h.winner,
                "timeUsedSeconds": h.duration,
                "endedAt": h.end_time.isoformat() if h.end_time else None
            })

    return user_history


@router.get("/{battle_id}")
async def get_battle(
    battle_id: uuid.UUID,
    player_index: Optional[int] = Query(None, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
  stmt = (
      select(Battle)
      .where(Battle.id == battle_id)
      .options(
          selectinload(Battle.players),
          selectinload(Battle.problem).selectinload(Problem.templates),
          selectinload(Battle.problem).selectinload(Problem.test_cases),
      )
  )
  result = await db.execute(stmt)
  battle = result.scalars().first()
  if not battle:
    raise HTTPException(status_code=404, detail="Battle not found")

  # Force reload/refresh players relationship to pick up recently joined combatants
  await db.refresh(battle, ["players"])

  is_host = battle.host_username == current_user.username
  is_player = any(p.username == current_user.username for p in battle.players)
  if not (is_host or is_player):
    if battle.status != "pending":
      raise HTTPException(status_code=403, detail="Forbidden: You are not a participant in this battle")

  now = datetime.now(timezone.utc)

  for p in battle.players:
    if p.username == current_user.username:
      p.is_active = True
      p.last_active = now
      break

  # Auto transition countdown
  if battle.status == "countdown" and battle.start_time:
    elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
    if elapsed >= 5:
      battle.status = "active"
      battle.start_time = battle.start_time + timedelta(seconds=5)

  # Auto transition finish
  if battle.status == "active" and battle.start_time:
    elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
    if elapsed >= battle.time_limit * 60:
      from app.services.scoring_service import ScoringService
      await ScoringService.finish_battle(db, battle.id)

  await db.commit()
  await db.refresh(battle)

  time_left = None
  if battle.status == "countdown" and battle.start_time:
    elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
    time_left = max(0, int(5 - elapsed))
  elif battle.status == "active" and battle.start_time:
    elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
    time_left = max(0, int(battle.time_limit * 60 - elapsed))

  problems_list = await _get_battle_problems(battle, db)
  return _room_dict(battle, now, problems_list, time_left)


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
  battle.status = "countdown"
  battle.start_time = now
  await db.commit()

  await manager.broadcast(str(battle_id), {
      "type": "battle_started",
      "status": "countdown",
      "start_time": now.isoformat(),
  })

  return {"status": "countdown", "start_time": now.isoformat()}


@router.post("/{battle_id}/update")
async def update_battle(
    battle_id: uuid.UUID,
    req: BattleUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
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

  if req.active_problem_index is not None:
    player.active_problem_index = req.active_problem_index

  # Parse progress
  progress_dict = {}
  if player.progress:
    try:
      progress_dict = json.loads(player.progress)
    except Exception:
      pass

  # Ensure first item has a slot if empty
  if not progress_dict:
    progress_dict["0"] = {
      "code": player.code or "",
      "lang": player.lang or "javascript",
      "solved": player.solved or False,
      "solved_at": player.solved_at.isoformat() if player.solved_at else None,
      "attempts": player.attempts or 0,
      "score": player.score or 0
    }

  # Update specific problem progress if problem_index is provided
  p_idx = str(req.problem_index) if req.problem_index is not None else "0"
  if p_idx not in progress_dict:
    progress_dict[p_idx] = {
      "code": "",
      "lang": "javascript",
      "solved": False,
      "solved_at": None,
      "attempts": 0,
      "score": 0
    }

  if req.attempts is not None:
    progress_dict[p_idx]["attempts"] = req.attempts
  if req.code is not None:
    progress_dict[p_idx]["code"] = req.code
  if req.lang is not None:
    progress_dict[p_idx]["lang"] = req.lang
  if req.solved is not None:
    progress_dict[p_idx]["solved"] = req.solved
    if req.solved:
      progress_dict[p_idx]["solved_at"] = now.isoformat()
  if req.score is not None:
    progress_dict[p_idx]["score"] = req.score

  # Keep old base attributes synced to problem 0 for compatibility
  if p_idx == "0":
    if req.attempts is not None: player.attempts = req.attempts
    if req.code is not None: player.code = req.code
    if req.lang is not None: player.lang = req.lang

  player.progress = json.dumps(progress_dict)

  # Check all-solved finish condition
  battle_stmt = (
      select(Battle)
      .where(Battle.id == battle_id)
      .options(selectinload(Battle.players))
  )
  battle_result = await db.execute(battle_stmt)
  battle = battle_result.scalars().first()
  if battle:
    # Update total score & solved on player base object
    player.score = sum(int(item.get("score", 0)) for item in progress_dict.values())

    # Check if all problems are solved by player
    pids_len = 1
    if battle.problem_ids:
      try:
        pids_len = len(json.loads(battle.problem_ids))
      except Exception:
        pass

    all_solved = len([k for k, v in progress_dict.items() if v.get("solved")]) >= pids_len
    player.solved = all_solved
    if all_solved and not player.solved_at:
      player.solved_at = now

    should_finish = False
    if len(battle.players) <= 2:
      if any(p.solved for p in battle.players):
        should_finish = True
    else:
      if all(p.solved for p in battle.players):
        should_finish = True
    if should_finish and battle.status != "finished":
      from app.services.scoring_service import ScoringService
      await ScoringService.finish_battle(db, battle.id)

  await manager.broadcast(str(battle_id), {
      "type": "state_update",
      "player_index": player.player_index,
      "score": player.score,
      "solved": player.solved,
      "attempts": req.attempts if req.attempts is not None else progress_dict[p_idx]["attempts"],
      "code": req.code if req.code is not None else progress_dict[p_idx]["code"],
      "lang": req.lang if req.lang is not None else progress_dict[p_idx]["lang"],
      "problem_index": req.problem_index,
      "active_problem_index": player.active_problem_index,
      "progress": progress_dict,
  })

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
  if not token:
    await websocket.close(code=4001, reason="Missing authentication token")
    return
  user = await _authenticate_ws_token(token)
  if not user:
    await websocket.close(code=4001, reason="Invalid or expired token")
    return

  ping_task = None
  try:
    battle_uuid = uuid.UUID(battle_id)
  except ValueError:
    await websocket.close(code=4004, reason="Invalid battle ID format")
    return

  # Spectator protection on connect & Resolve secure player index
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
    resolved_player_index = player.player_index

  # Connect websocket
  await manager.connect(battle_id, user.username, websocket)

  async def ping_loop():
    try:
      while True:
        await asyncio.sleep(15)
        await websocket.send_json({"type": "ping"})
    except Exception:
      try:
        await websocket.close()
      except Exception:
        pass

  ping_task = asyncio.create_task(ping_loop())

  # Mark player active in DB on connection
  async with AsyncSessionLocal() as db:
    stmt = select(BattlePlayer).where(
        BattlePlayer.battle_id == battle_uuid,
        BattlePlayer.player_index == resolved_player_index
    )
    res = await db.execute(stmt)
    db_player = res.scalars().first()
    if db_player:
      db_player.is_active = True
      db_player.last_active = datetime.now(timezone.utc)
      await db.commit()

  # Broadcast active state
  await manager.broadcast(battle_id, {
      "type": "connect_status",
      "player_index": resolved_player_index,
      "active": True,
  })

  # Send Authoritative Room Snapshot to client on connection/reconnection
  async with AsyncSessionLocal() as db:
    stmt = (
        select(Battle)
        .where(Battle.id == battle_uuid)
        .options(
            selectinload(Battle.players),
            selectinload(Battle.problem).selectinload(Problem.templates),
            selectinload(Battle.problem).selectinload(Problem.test_cases),
        )
    )
    res = await db.execute(stmt)
    battle = res.scalars().first()
    if battle:
      # Explicitly refresh relationships
      await db.refresh(battle, ["players"])

      now = datetime.now(timezone.utc)

      # Auto transition countdown
      if battle.status == "countdown" and battle.start_time:
        elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
        if elapsed >= 5:
          battle.status = "active"
          battle.start_time = battle.start_time + timedelta(seconds=5)
          await db.commit()
          await db.refresh(battle)

      time_left = None
      if battle.status == "countdown" and battle.start_time:
        elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
        time_left = max(0, int(5 - elapsed))
      elif battle.status == "active" and battle.start_time:
        elapsed = (now - _ensure_aware(battle.start_time)).total_seconds()
        time_left = max(0, int(battle.time_limit * 60 - elapsed))

      problems_list = await _get_battle_problems(battle, db)
      await websocket.send_json({
          "type": "room_snapshot",
          "room": _room_dict(battle, now, problems_list, time_left)
      })

  try:
    while True:
      data = await websocket.receive_json()
      msg_type = data.get("type")

      if msg_type == "update":
        p_idx = resolved_player_index

        attempts = data.get("attempts")
        code = data.get("code")
        lang = data.get("lang")
        solved = data.get("solved")
        score = data.get("score")
        prob_index = data.get("problem_index")
        act_prob_index = data.get("active_problem_index")

        async with AsyncSessionLocal() as db:
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

            if act_prob_index is not None:
              player.active_problem_index = act_prob_index

            progress_dict = {}
            if player.progress:
              try:
                progress_dict = json.loads(player.progress)
              except Exception:
                pass

            if not progress_dict:
              progress_dict["0"] = {
                "code": player.code or "",
                "lang": player.lang or "javascript",
                "solved": player.solved or False,
                "solved_at": player.solved_at.isoformat() if player.solved_at else None,
                "attempts": player.attempts or 0,
                "score": player.score or 0
              }

            q_idx = str(prob_index) if prob_index is not None else "0"
            if q_idx not in progress_dict:
              progress_dict[q_idx] = {
                "code": "",
                "lang": "javascript",
                "solved": False,
                "solved_at": None,
                "attempts": 0,
                "score": 0
              }

            if attempts is not None:
              progress_dict[q_idx]["attempts"] = attempts
            if code is not None:
              progress_dict[q_idx]["code"] = code
            if lang is not None:
              progress_dict[q_idx]["lang"] = lang
            if solved is not None:
              progress_dict[q_idx]["solved"] = solved
              if solved:
                progress_dict[q_idx]["solved_at"] = now.isoformat()
            if score is not None:
              progress_dict[q_idx]["score"] = score

            if q_idx == "0":
              if attempts is not None: player.attempts = attempts
              if code is not None: player.code = code
              if lang is not None: player.lang = lang

            player.progress = json.dumps(progress_dict)

            # Check all-solved finish condition
            battle_stmt = (
                select(Battle)
                .where(Battle.id == battle_uuid)
                .options(selectinload(Battle.players))
            )
            battle_result = await db.execute(battle_stmt)
            battle = battle_result.scalars().first()
            if battle:
              # Update player score/solved
              player.score = sum(int(item.get("score", 0)) for item in progress_dict.values())

              pids_len = 1
              if battle.problem_ids:
                try:
                  pids_len = len(json.loads(battle.problem_ids))
                except Exception:
                  pass

              all_solved = len([k for k, v in progress_dict.items() if v.get("solved")]) >= pids_len
              player.solved = all_solved
              if all_solved and not player.solved_at:
                player.solved_at = now

              should_finish = False
              if len(battle.players) <= 2:
                if any(p.solved for p in battle.players):
                  should_finish = True
              else:
                if all(p.solved for p in battle.players):
                  should_finish = True
              if should_finish and battle.status != "finished":
                from app.services.scoring_service import ScoringService
                await ScoringService.finish_battle(db, battle_uuid)

            await db.commit()
            db_score = player.score
            db_solved = player.solved
            db_progress = progress_dict
            db_active_problem_index = player.active_problem_index

        await manager.broadcast(battle_id, {
            "type": "state_update",
            "player_index": p_idx,
            "score": db_score,
            "solved": db_solved,
            "attempts": attempts if attempts is not None else (progress_dict.get(q_idx, {}).get("attempts", 0)),
            "code": code,
            "lang": lang,
            "problem_index": prob_index,
            "active_problem_index": db_active_problem_index,
            "progress": db_progress,
        })

      elif msg_type == "timer_expired":
        from app.services.scoring_service import ScoringService
        from app.core.config import get_settings
        settings = get_settings()
        redis_client = None
        if settings.REDIS_URL:
          try:
            import redis.asyncio as aioredis
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
          except Exception:
            pass
        async with AsyncSessionLocal() as db:
          await ScoringService.finish_battle(db, battle_uuid, redis_client=redis_client)
        if redis_client:
          await redis_client.close()

      elif msg_type == "ping":
        await websocket.send_json({"type": "pong"})

  except WebSocketDisconnect:
    manager.disconnect(battle_id, user.username, websocket)
    
    # Check if there is still an active connection for this user (e.g. from another tab or quick refresh)
    still_connected = (
        battle_id in manager.active_connections 
        and user.username in manager.active_connections[battle_id]
    )
    if not still_connected:
      # Mark player inactive in DB on disconnect
      async with AsyncSessionLocal() as db:
        stmt = select(BattlePlayer).where(
            BattlePlayer.battle_id == battle_uuid,
            BattlePlayer.player_index == resolved_player_index
        )
        res = await db.execute(stmt)
        db_player = res.scalars().first()
        if db_player:
          db_player.is_active = False
          await db.commit()

      await manager.broadcast(battle_id, {
          "type": "connect_status",
          "player_index": resolved_player_index,
          "active": False,
      })
  except Exception as e:
    logger.warning(f"[WebSocket] Error: {e}")
    manager.disconnect(battle_id, user.username, websocket)
    
    still_connected = (
        battle_id in manager.active_connections 
        and user.username in manager.active_connections[battle_id]
    )
    if not still_connected:
      async with AsyncSessionLocal() as db:
        stmt = select(BattlePlayer).where(
            BattlePlayer.battle_id == battle_uuid,
            BattlePlayer.player_index == resolved_player_index
        )
        res = await db.execute(stmt)
        db_player = res.scalars().first()
        if db_player:
          db_player.is_active = False
          await db.commit()

      await manager.broadcast(battle_id, {
          "type": "connect_status",
          "player_index": resolved_player_index,
          "active": False,
      })
  finally:
    if ping_task:
      ping_task.cancel()
      try:
        await ping_task
      except asyncio.CancelledError:
        pass


async def start_redis_listener(redis_url: str):
  """Listens to 'battle_events' Redis channel and broadcasts messages to active WebSocket clients."""
  logger.info("[RedisListener] Starting redis battle_events pubsub listener...")
  import redis.asyncio as aioredis
  import json
  r = aioredis.from_url(redis_url, decode_responses=True)
  pubsub = r.pubsub()
  await pubsub.subscribe("battle_events")
  try:
    while True:
      message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
      if message:
        try:
          data = json.loads(message["data"])
          b_id = data.get("battle_id")
          if b_id:
            await manager.broadcast(str(b_id), data)
        except Exception as e:
          logger.warning(f"[RedisListener] Error parsing or broadcasting message: {e}")
      await asyncio.sleep(0.1)
  except asyncio.CancelledError:
    logger.info("[RedisListener] Redis listener task cancelled.")
  finally:
    await pubsub.unsubscribe("battle_events")
    await r.close()
