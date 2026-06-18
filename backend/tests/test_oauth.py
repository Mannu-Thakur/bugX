import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
from app.services.oauth_service import generate_state


@pytest.mark.asyncio
async def test_oauth_dev_mock_flow(client: AsyncClient):
    # Mock settings to be development and ENABLE_MOCK_OAUTH=True
    mock_settings = MagicMock()
    mock_settings.ENV = "development"
    mock_settings.is_development = True
    mock_settings.ENABLE_MOCK_OAUTH = True
    mock_settings.GITHUB_CLIENT_ID = "real-github-client-id"
    mock_settings.GITHUB_CLIENT_SECRET = "real-github-client-secret"
    mock_settings.API_V1_PREFIX = "/api/v1"
    mock_settings.BACKEND_URL = "http://localhost:8000"
    mock_settings.FRONTEND_URL = "http://localhost:5173"
    mock_settings.SECRET_KEY = "test-secret-key-32-chars-minimum!"

    with patch("app.services.oauth_service.settings", mock_settings), \
         patch("app.routers.oauth.settings", mock_settings):
        
        # 1. Authorize redirect
        resp = await client.get("/api/v1/auth/oauth/github/authorize", follow_redirects=False)
        assert resp.status_code == 302
        location = resp.headers.get("Location")
        # Should redirect directly to local callback since it's dev + mock enabled
        assert "/api/v1/auth/oauth/github/callback" in location
        assert "code=mock_code_" in location
        assert "state=" in location

        # 2. Callback landing
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(location)
        q = parse_qs(parsed.query)
        code = q["code"][0]
        state = q["state"][0]

        resp_callback = await client.get(
            f"/api/v1/auth/oauth/github/callback?code={code}&state={state}",
            follow_redirects=False
        )
        assert resp_callback.status_code in [302, 307]
        frontend_redirect = resp_callback.headers.get("Location")
        assert "http://localhost:5173/auth/callback" in frontend_redirect
        assert "token=" in frontend_redirect
        assert "username=" in frontend_redirect


@pytest.mark.asyncio
async def test_oauth_prod_real_flow(client: AsyncClient):
    # Mock settings to be production and ENABLE_MOCK_OAUTH=False
    mock_settings = MagicMock()
    mock_settings.ENV = "production"
    mock_settings.is_development = False
    mock_settings.ENABLE_MOCK_OAUTH = False
    mock_settings.GITHUB_CLIENT_ID = "real-github-client-id"
    mock_settings.GITHUB_CLIENT_SECRET = "real-github-client-secret"
    mock_settings.API_V1_PREFIX = "/api/v1"
    mock_settings.BACKEND_URL = "http://localhost:8000"
    mock_settings.FRONTEND_URL = "http://localhost:5173"
    mock_settings.SECRET_KEY = "test-secret-key-32-chars-minimum!"

    with patch("app.services.oauth_service.settings", mock_settings), \
         patch("app.routers.oauth.settings", mock_settings):
        
        resp = await client.get("/api/v1/auth/oauth/github/authorize", follow_redirects=False)
        assert resp.status_code == 302
        location = resp.headers.get("Location")
        # Should redirect to real github.com oauth page
        assert "github.com/login/oauth/authorize" in location
        assert "client_id=real-github-client-id" in location
        assert "redirect_uri=" in location


@pytest.mark.asyncio
async def test_oauth_prod_rejects_mock_code(client: AsyncClient):
    # Mock settings to be production and ENABLE_MOCK_OAUTH=False
    mock_settings = MagicMock()
    mock_settings.ENV = "production"
    mock_settings.is_development = False
    mock_settings.ENABLE_MOCK_OAUTH = False
    mock_settings.GITHUB_CLIENT_ID = "real-github-client-id"
    mock_settings.GITHUB_CLIENT_SECRET = "real-github-client-secret"
    mock_settings.API_V1_PREFIX = "/api/v1"
    mock_settings.BACKEND_URL = "http://localhost:8000"
    mock_settings.FRONTEND_URL = "http://localhost:5173"
    mock_settings.SECRET_KEY = "test-secret-key-32-chars-minimum!"

    with patch("app.services.oauth_service.settings", mock_settings), \
         patch("app.routers.oauth.settings", mock_settings):
        
        state = generate_state()
        
        with patch("app.services.oauth_service._exchange_code", side_effect=Exception("Attempted real code exchange")) as mock_exchange:
            resp = await client.get(
                f"/api/v1/auth/oauth/github/callback?code=mock_code_1234&state={state}",
                follow_redirects=False
            )
            mock_exchange.assert_called_once_with("github", "mock_code_1234")
            assert resp.status_code in [302, 307]
            location = resp.headers.get("Location")
            assert "error=" in location


def test_settings_startup_validation():
    from app.core.config import get_settings
    # Clear settings lru cache before loading new settings envs
    get_settings.cache_clear()
    
    with patch.dict("os.environ", {
        "ENV": "production",
        "ENABLE_MOCK_OAUTH": "true",
        "SECRET_KEY": "test-secret-key-32-chars-minimum!"
    }):
        with pytest.raises(ValueError, match="ENABLE_MOCK_OAUTH must be disabled outside development"):
            get_settings()
            
    # Clear again to ensure clean state for other parts
    get_settings.cache_clear()
