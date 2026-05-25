import asyncio
import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from httpx import ASGITransport
from jose import jwt
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.core.security import ALGORITHM
from app.main import create_app
from app.models.user import User

BACKEND_ROOT = Path(__file__).resolve().parents[1]
RAW_RESULTS = BACKEND_ROOT / "api_round_2_raw_results.json"


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: redact_token(item) if key == "access_token" else redact(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def redact_token(token: Any) -> Any:
    if isinstance(token, str) and len(token) > 20:
        return f"{token[:20]}..."
    return token


def validation_error(body: Any) -> bool:
    return isinstance(body, dict) and body.get("code") == "VALIDATION_ERROR" and isinstance(body.get("detail"), list)


def auth_error(body: Any) -> bool:
    return isinstance(body, dict) and body.get("detail") == "Incorrect email or password" and body.get("code") == "UNAUTHORIZED"


def unauthorized(body: Any) -> bool:
    return isinstance(body, dict) and body.get("code") == "UNAUTHORIZED"


def forbidden_inactive(body: Any) -> bool:
    return isinstance(body, dict) and body.get("detail") == "Inactive user" and body.get("code") == "FORBIDDEN"


def user_profile(body: Any, *, email: str | None = None, username: str | None = None, avatar_url: str | None = None) -> bool:
    if not isinstance(body, dict):
        return False
    if "password_hash" in body:
        return False
    required = {"id", "email", "username", "role", "avatar_url", "is_active", "created_at"}
    if not required.issubset(body.keys()):
        return False
    if email is not None and body.get("email") != email:
        return False
    if username is not None and body.get("username") != username:
        return False
    if avatar_url is not None and body.get("avatar_url") != avatar_url:
        return False
    return True


class RoundRunner:
    def __init__(self) -> None:
        self.run_id = str(int(time.time()))
        self.results: list[dict[str, Any]] = []

    async def request(
        self,
        client: httpx.AsyncClient,
        case_id: str,
        endpoint: str,
        method: str,
        path: str,
        expected_status: int,
        checker: Callable[[Any], bool],
        *,
        token: str | None = None,
        json_body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        request_headers = {"Accept": "application/json"}
        if json_body is not None:
            request_headers["Content-Type"] = "application/json"
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
        if headers:
            request_headers.update(headers)

        response = await client.request(method, path, json=json_body, headers=request_headers)
        try:
            body: Any = response.json()
        except Exception:
            body = response.text

        status_passed = response.status_code == expected_status
        shape_passed = checker(body)
        self.results.append(
            {
                "case_id": case_id,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": response.status_code,
                "result": "PASS" if status_passed and shape_passed else "FAIL",
                "status_passed": status_passed,
                "shape_passed": shape_passed,
                "body": redact(body),
            }
        )
        return body

    async def register(self, client: httpx.AsyncClient, label: str) -> dict[str, Any]:
        email = f"round-2-{self.run_id}-{label}@example.com"
        username = f"round_2_{self.run_id}_{label}"
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": email, "username": username, "password": "Password123"},
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )
        body = response.json()
        if response.status_code != 200:
            raise RuntimeError(f"setup register {label} failed: {response.status_code} {body}")
        return {"email": email, "username": username, "token": body["access_token"], "user": body["user"]}

    async def deactivate_user(self, sessionmaker_: async_sessionmaker[AsyncSession], email: str) -> None:
        async with sessionmaker_() as session:
            await session.execute(update(User).where(User.email == email).values(is_active=False))
            await session.commit()

    async def run(self) -> dict[str, Any]:
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        sessionmaker_ = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

        app = create_app()

        async def override_get_db():
            async with sessionmaker_() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db

        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            primary = await self.register(client, "primary")
            secondary = await self.register(client, "secondary")

            login_body = await self.request(
                client,
                "R2-01",
                "POST /auth/login",
                "POST",
                "/api/v1/auth/login",
                200,
                lambda body: isinstance(body, dict)
                and isinstance(body.get("access_token"), str)
                and body.get("token_type") == "bearer"
                and user_profile(body.get("user"), email=primary["email"], username=primary["username"]),
                json_body={"email": primary["email"], "password": "Password123"},
            )
            primary_token = login_body["access_token"]

            await self.request(
                client,
                "R2-02",
                "POST /auth/login",
                "POST",
                "/api/v1/auth/login",
                401,
                auth_error,
                json_body={"email": primary["email"], "password": "WrongPassword123"},
            )
            await self.request(
                client,
                "R2-03",
                "POST /auth/login",
                "POST",
                "/api/v1/auth/login",
                401,
                auth_error,
                json_body={"email": f"round-2-{self.run_id}-unknown@example.com", "password": "Password123"},
            )
            await self.request(
                client,
                "R2-04",
                "POST /auth/login",
                "POST",
                "/api/v1/auth/login",
                422,
                validation_error,
                json_body={"email": "bad-email", "password": "Password123"},
            )
            await self.request(
                client,
                "R2-05",
                "POST /auth/login",
                "POST",
                "/api/v1/auth/login",
                422,
                validation_error,
                json_body={"email": primary["email"]},
            )
            await self.request(
                client,
                "R2-06",
                "GET /users/me",
                "GET",
                "/api/v1/users/me",
                200,
                lambda body: user_profile(body, email=primary["email"], username=primary["username"]),
                token=primary_token,
            )
            await self.request(
                client,
                "R2-07",
                "GET /users/me",
                "GET",
                "/api/v1/users/me",
                401,
                unauthorized,
            )
            await self.request(
                client,
                "R2-08",
                "GET /users/me",
                "GET",
                "/api/v1/users/me",
                401,
                unauthorized,
                headers={"Authorization": "Bearer not-a-jwt"},
            )
            tampered = f"{primary_token[:-1]}{'a' if primary_token[-1] != 'a' else 'b'}"
            await self.request(
                client,
                "R2-09",
                "GET /users/me",
                "GET",
                "/api/v1/users/me",
                401,
                unauthorized,
                headers={"Authorization": f"Bearer {tampered}"},
            )
            settings = get_settings()
            expired_token = jwt.encode(
                {
                    "sub": primary["user"]["id"],
                    "role": "USER",
                    "exp": datetime.utcnow() - timedelta(minutes=5),
                },
                settings.SECRET_KEY,
                algorithm=ALGORITHM,
            )
            await self.request(
                client,
                "R2-10",
                "GET /users/me",
                "GET",
                "/api/v1/users/me",
                401,
                unauthorized,
                token=expired_token,
            )
            await self.deactivate_user(sessionmaker_, secondary["email"])
            await self.request(
                client,
                "R2-11",
                "GET /users/me",
                "GET",
                "/api/v1/users/me",
                403,
                forbidden_inactive,
                token=secondary["token"],
            )

            renamed = f"round_2_{self.run_id}_renamed"
            await self.request(
                client,
                "R2-12",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                200,
                lambda body: user_profile(body, email=primary["email"], username=renamed),
                token=primary_token,
                json_body={"username": renamed},
            )
            avatar = "https://example.com/a.png"
            await self.request(
                client,
                "R2-13",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                200,
                lambda body: user_profile(body, email=primary["email"], username=renamed, avatar_url=avatar),
                token=primary_token,
                json_body={"avatar_url": avatar},
            )
            await self.request(
                client,
                "R2-14",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                422,
                lambda body: isinstance(body, dict) and body.get("detail") == "USERNAME_TAKEN" and body.get("code") == "ERROR",
                token=primary_token,
                json_body={"username": secondary["username"]},
            )
            await self.request(
                client,
                "R2-15",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                422,
                validation_error,
                token=primary_token,
                json_body={"username": "bad name!"},
            )
            await self.request(
                client,
                "R2-16",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                422,
                validation_error,
                token=primary_token,
                json_body={"username": "ab"},
            )
            await self.request(
                client,
                "R2-17",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                422,
                validation_error,
                token=primary_token,
                json_body={"avatar_url": "a" * 513},
            )
            await self.request(
                client,
                "R2-18",
                "PATCH /users/me",
                "PATCH",
                "/api/v1/users/me",
                200,
                lambda body: user_profile(body, email=primary["email"], username=renamed, avatar_url=avatar),
                token=primary_token,
                json_body={},
            )

        await engine.dispose()
        payload = {
            "round": 2,
            "run_id": self.run_id,
            "agent": "Codex GPT-5",
            "execution_mode": "FastAPI ASGITransport with isolated SQLite test database",
            "api_base_url": "http://test/api/v1",
            "database_url_used": "sqlite+aiosqlite:///:memory:",
            "results": self.results,
        }
        RAW_RESULTS.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return payload


async def main() -> None:
    runner = RoundRunner()
    payload = await runner.run()
    passed = sum(1 for item in payload["results"] if item["result"] == "PASS")
    total = len(payload["results"])
    print(f"Round 2: {passed}/{total} checks passed")
    print(f"Raw results written to {RAW_RESULTS.name}")
    for row in payload["results"]:
        print(f"[{row['result']}] {row['case_id']} expected={row['expected']} actual={row['actual']} shape={row['shape_passed']}")


if __name__ == "__main__":
    asyncio.run(main())
