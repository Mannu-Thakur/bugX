from typing import Dict
from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_optional_user
from app.schemas.dynamic_cat import StatsOverview
from app.services.statistics_service import StatisticsService
from app.models.user import User

router = APIRouter()

class StatsConnectionManager:
    def __init__(self):
        # Dict of session_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket, app):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        await self.broadcast_online_count(app)

    async def disconnect(self, session_id: str, app):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        await self.broadcast_online_count(app)

    async def broadcast_online_count(self, app):
        import time
        now = time.time()
        active_users = getattr(app.state, "active_users", {})
        
        # Active HTTP session IDs
        http_sessions = {sid for sid, t in active_users.items() if now - t <= 30}
        
        # Active WebSocket session IDs
        ws_sessions = set(self.active_connections.keys())
        
        # Union of both to prevent double-counting
        total_sessions = http_sessions.union(ws_sessions)
        count = len(total_sessions)
        
        message = {"online_users": max(1, count)}
        for connection in list(self.active_connections.values()):
            try:
                await connection.send_json(message)
            except Exception:
                pass

stats_manager = StatsConnectionManager()

@router.get("/overview", response_model=StatsOverview)
async def get_overview(
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return await StatisticsService.get_overview(db, user_id=user_id)

@router.get("/online-users")
async def get_online_users(request: Request):
    import time
    now = time.time()
    active_users = getattr(request.app.state, "active_users", {})
    http_sessions = {sid for sid, t in active_users.items() if now - t <= 30}
    ws_sessions = set(stats_manager.active_connections.keys())
    total_sessions = http_sessions.union(ws_sessions)
    return {"online_users": max(1, len(total_sessions))}

@router.post("/online-users/disconnect")
async def disconnect_online_user(request: Request):
    try:
        body = await request.json()
        session_id = body.get("session_id")
        if session_id:
            active_users = getattr(request.app.state, "active_users", {})
            if session_id in active_users:
                active_users.pop(session_id, None)
            await stats_manager.disconnect(session_id, request.app)
    except Exception:
        pass
    return {"status": "ok"}

@router.websocket("/ws")
async def stats_websocket(websocket: WebSocket, session_id: str = "anonymous"):
    app = websocket.app
    await stats_manager.connect(session_id, websocket, app)
    try:
        while True:
            # Keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        await stats_manager.disconnect(session_id, app)
    except Exception:
        await stats_manager.disconnect(session_id, app)
