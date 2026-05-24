from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.rate_limit_service = RateLimitService(settings.REDIS_URL)
        yield
        await app.state.rate_limit_service.close()

    app = FastAPI(
        title="XYZ Platform API",
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
    from app.routers.users import router as users_router

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
        users_router,
        prefix=f"{settings.API_V1_PREFIX}/users",
        tags=["users"],
    )

    return app


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    if request.client is None:
        return "unknown"

    return request.client.host


app = create_app()
