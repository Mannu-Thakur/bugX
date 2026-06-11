from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.routers.health import router as health_router
from app.services.rate_limit_service import RateLimitService
from app.services.upload_service import storage_root
import app.models


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.rate_limit_service = RateLimitService(settings.REDIS_URL)

        # Auto-create tables and auto-seed the database if empty on startup
        try:
            from app.core.database import Base, engine, AsyncSessionLocal
            from app.services.seeder_service import seed_problems

            # Dynamically create tables on SQLite/PostgreSQL
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await _ensure_user_profile_columns(conn)

            # Seed base problems
            async with AsyncSessionLocal() as session:
                await seed_problems(session)
        except Exception as e:
            print(f"Startup database initialization error: {e}")

        yield
        await app.state.rate_limit_service.close()

    app = FastAPI(
        title="AlgoAxis API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    public_uploads = storage_root() / "public"
    public_uploads.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=public_uploads), name="uploads")

    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.middleware("http")
    async def ip_rate_limit_middleware(request: Request, call_next):
        client_ip = _client_ip(request)
        rate_limiter = getattr(request.app.state, "rate_limit_service", None)
        if rate_limiter is None:
            rate_limiter = RateLimitService(settings.REDIS_URL)
            request.app.state.rate_limit_service = rate_limiter

        allowed = await rate_limiter.check_ip(
            client_ip,
            settings.MAX_REQUESTS_PER_MINUTE_IP,
        )
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests", "code": "RATE_LIMIT"},
            )

        return await call_next(request)

    from app.routers.auth import router as auth_router
    from app.routers.oauth import router as oauth_router
    from app.routers.users import router as users_router
    from app.routers.submissions import router as submissions_router
    from app.routers.leaderboard import router as leaderboard_router
    from app.routers.problems import router as problems_router
    from app.routers.battle import router as battle_router

    app.include_router(
        health_router,
        prefix=settings.API_V1_PREFIX,
        tags=["health"],
    )
    app.include_router(
        auth_router,
        prefix=f"{settings.API_V1_PREFIX}/auth",
        tags=["auth"],
    )
    app.include_router(
        oauth_router,
        prefix=f"{settings.API_V1_PREFIX}/auth",
        tags=["auth"],
    )
    app.include_router(
        users_router,
        prefix=f"{settings.API_V1_PREFIX}/users",
        tags=["users"],
    )
    app.include_router(
        submissions_router,
        prefix=f"{settings.API_V1_PREFIX}",
    )
    app.include_router(
        problems_router,
        prefix=f"{settings.API_V1_PREFIX}/problems",
        tags=["problems"],
    )
    app.include_router(
        leaderboard_router,
        prefix=f"{settings.API_V1_PREFIX}/leaderboard",
        tags=["leaderboard"],
    )
    app.include_router(
        battle_router,
        prefix=f"{settings.API_V1_PREFIX}/battle",
        tags=["battle"],
    )

    return app


async def _ensure_user_profile_columns(conn) -> None:
    required_columns = {
        "leetcode_url": "VARCHAR(512)",
        "github_url": "VARCHAR(512)",
        "linkedin_url": "VARCHAR(512)",
        "portfolio_url": "VARCHAR(512)",
        "oauth_provider": "VARCHAR(50)",
        "oauth_id": "VARCHAR(255)",
    }

    def existing_columns(sync_conn) -> set[str]:
        try:
            return {column["name"] for column in inspect(sync_conn).get_columns("users")}
        except Exception:
            # Table doesn't exist yet; create_all will handle it
            return set()

    existing = await conn.run_sync(existing_columns)
    for column_name, column_type in required_columns.items():
        if column_name not in existing:
            try:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))
            except Exception:
                # Column may have been added by a concurrent worker; safe to ignore
                pass

    # Ensure password_hash is nullable (for existing databases)
    try:
        await conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"))
    except Exception:
        pass


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    if request.client is None:
        return "unknown"

    return request.client.host


app = create_app()
