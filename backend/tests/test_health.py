from httpx import ASGITransport, AsyncClient

from app.main import create_app


async def test_health_returns_dependency_statuses():
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert body["db"] in {"ok", "error"}
    assert body["redis"] in {"ok", "error"}


async def test_ip_rate_limit_returns_429_when_exceeded():
    class DenyAllRateLimiter:
        async def check_ip(self, ip_address: str, max_requests: int) -> bool:
            return False

        async def ping(self) -> bool:
            return True

        async def close(self) -> None:
            return None

    app = create_app()
    app.state.rate_limit_service = DenyAllRateLimiter()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 429
    assert response.json() == {
        "detail": "Too many requests",
        "code": "RATE_LIMIT",
    }
