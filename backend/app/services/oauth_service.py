"""OAuth social login service — Google, GitHub, LinkedIn."""

import hashlib
import hmac
import re
import secrets
import time
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.user import RoleEnum, User
from app.models.user_stats import UserStats
from app.repositories.user_repo import UserRepo

settings = get_settings()

# ─── Provider Configuration ──────────────────────────────────────────────────

PROVIDERS: dict[str, dict] = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": "openid email profile",
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scopes": "user:email",
    },
    "linkedin": {
        "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo_url": "https://api.linkedin.com/v2/userinfo",
        "scopes": "openid profile email",
    },
}


def _get_client_credentials(provider: str) -> tuple[str, str]:
    """Return (client_id, client_secret) for the given provider."""
    provider_upper = provider.upper()
    client_id = getattr(settings, f"{provider_upper}_CLIENT_ID", "")
    client_secret = getattr(settings, f"{provider_upper}_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"OAuth for {provider} is not configured. "
                   f"Set {provider_upper}_CLIENT_ID and {provider_upper}_CLIENT_SECRET in .env.",
        )
    return client_id, client_secret


def _redirect_uri(provider: str) -> str:
    """Build the OAuth callback redirect URI."""
    return f"{settings.BACKEND_URL}{settings.API_V1_PREFIX}/auth/oauth/{provider}/callback"


# ─── Stateless CSRF state token (HMAC-based, no server storage needed) ───────

def generate_state() -> str:
    """Generate a signed, timestamped state token for CSRF protection."""
    ts = str(int(time.time()))
    nonce = secrets.token_urlsafe(8)
    payload = f"{ts}.{nonce}"
    sig = hmac.new(
        settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()[:16]
    return f"{payload}.{sig}"


def verify_state(state: str) -> bool:
    """Verify HMAC signature and expiry (10 min) of a state token."""
    try:
        parts = state.rsplit(".", 1)
        if len(parts) != 2:
            return False
        payload, sig = parts
        expected = hmac.new(
            settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            return False
        ts_str = payload.split(".")[0]
        if time.time() - int(ts_str) > 600:
            return False
        return True
    except Exception:
        return False


# ─── Build Authorize URL ─────────────────────────────────────────────────────

def get_authorize_url(provider: str) -> str:
    """Build the full OAuth authorization URL for a given provider."""
    if provider not in PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}. Supported: {', '.join(PROVIDERS.keys())}",
        )

    client_id, _ = _get_client_credentials(provider)
    cfg = PROVIDERS[provider]
    state = generate_state()

    # Dev mock bypass if credentials are placeholders
    if settings.is_development and client_id.startswith("your-"):
        callback_url = _redirect_uri(provider)
        params = {
            "code": f"mock_code_{secrets.token_hex(4)}",
            "state": state,
        }
        return f"{callback_url}?{urlencode(params)}"

    params: dict[str, str] = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri(provider),
        "scope": cfg["scopes"],
        "state": state,
        "response_type": "code",
    }

    if provider == "google":
        params["access_type"] = "offline"
        params["prompt"] = "consent"

    return f"{cfg['authorize_url']}?{urlencode(params)}"


# ─── Exchange Authorization Code for Access Token ────────────────────────────

async def _exchange_code(provider: str, code: str) -> str:
    """Exchange an authorization code for an access token."""
    client_id, client_secret = _get_client_credentials(provider)
    cfg = PROVIDERS[provider]

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": _redirect_uri(provider),
        "grant_type": "authorization_code",
    }

    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(cfg["token_url"], data=data, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to exchange code with {provider}: {resp.text}",
        )

    body = resp.json()
    access_token = body.get("access_token")
    if not access_token:
        error_desc = body.get("error_description", body.get("error", "unknown error"))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No access_token from {provider}: {error_desc}",
        )

    return access_token


# ─── Fetch User Profile from Provider ────────────────────────────────────────

async def _fetch_github_email(access_token: str) -> Optional[str]:
    """Fetch the primary verified email from GitHub /user/emails."""
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get("https://api.github.com/user/emails", headers=headers)
    if resp.status_code != 200:
        return None
    emails = resp.json()
    for e in emails:
        if e.get("primary") and e.get("verified"):
            return e["email"]
    for e in emails:
        if e.get("verified"):
            return e["email"]
    return emails[0]["email"] if emails else None


async def _fetch_user_profile(provider: str, access_token: str) -> dict:
    """Fetch email, name, picture, and provider_id from the OAuth provider."""
    cfg = PROVIDERS[provider]
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(cfg["userinfo_url"], headers=headers)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch user profile from {provider}.",
        )

    data = resp.json()

    if provider == "google":
        return {
            "email": data.get("email", ""),
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "provider_id": str(data.get("id", "")),
        }

    if provider == "github":
        email = data.get("email")
        if not email:
            email = await _fetch_github_email(access_token)
        return {
            "email": email or "",
            "name": data.get("login", ""),
            "picture": data.get("avatar_url"),
            "provider_id": str(data.get("id", "")),
            "github_url": data.get("html_url"),
        }

    if provider == "linkedin":
        return {
            "email": data.get("email", ""),
            "name": data.get("name", data.get("given_name", "")),
            "picture": data.get("picture"),
            "provider_id": str(data.get("sub", "")),
        }

    return {}


# ─── Generate Unique Username ────────────────────────────────────────────────

def _generate_unique_username(base: str) -> str:
    """Create a username from a name or email, appending a random suffix."""
    clean = re.sub(r"[^a-zA-Z0-9_-]", "", base.split("@")[0])
    if len(clean) < 3:
        clean = "user"
    if len(clean) > 40:
        clean = clean[:40]
    return f"{clean}_{secrets.token_hex(3)}"


# ─── Main Callback Handler ──────────────────────────────────────────────────

async def handle_oauth_callback(
    provider: str, code: str, state: str, db: AsyncSession
) -> dict:
    """
    Full OAuth callback flow:
    1. Verify state (CSRF)
    2. Exchange code for access token
    3. Fetch user profile from provider
    4. Find existing user or create new one (auto-link by email)
    5. Generate and return JWT
    """
    # 1. Verify CSRF state
    if not verify_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state. Please try again.",
        )

    client_id, _ = _get_client_credentials(provider)
    is_mock = settings.is_development and (client_id.startswith("your-") or code.startswith("mock_code"))

    if is_mock:
        profile = {
            "email": f"mock-{provider}-user@xyz-platform.com",
            "name": f"Mock {provider.capitalize()} User",
            "picture": f"https://api.dicebear.com/7.x/bottts/svg?seed=mock-{provider}",
            "provider_id": f"mock-{provider}-id-12345",
            "github_url": f"https://github.com/mock-{provider}-user" if provider == "github" else None,
        }
    else:
        # 2. Exchange authorization code for access token
        access_token = await _exchange_code(provider, code)

        # 3. Fetch user profile
        profile = await _fetch_user_profile(provider, access_token)

    email = profile.get("email")
    provider_id = profile.get("provider_id", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not retrieve email from {provider}. "
                   f"Ensure your {provider} account has a verified email.",
        )

    user_repo = UserRepo(db)

    # 4. Find existing user — first by OAuth identity, then by email
    user = None
    if provider_id:
        user = await user_repo.get_by_oauth(provider, provider_id)

    if not user:
        user = await user_repo.get_by_email(email)
        if user:
            # Auto-link OAuth to existing account
            user.oauth_provider = provider
            user.oauth_id = provider_id
            if not user.avatar_url and profile.get("picture"):
                user.avatar_url = profile["picture"]
            if provider == "github" and profile.get("github_url") and not user.github_url:
                user.github_url = profile["github_url"]
            await db.commit()
            await db.refresh(user)

    # 5. Create new user if not found
    if not user:
        username = _generate_unique_username(profile.get("name", email))
        while await user_repo.get_by_username(username):
            username = _generate_unique_username(profile.get("name", email))

        user = User(
            email=email,
            username=username,
            password_hash=None,
            role=RoleEnum.USER,
            oauth_provider=provider,
            oauth_id=provider_id,
            avatar_url=profile.get("picture"),
            github_url=profile.get("github_url"),
        )
        db.add(user)
        await db.flush()

        new_stats = UserStats(user_id=user.id)
        db.add(new_stats)
        await db.commit()
        await db.refresh(user)

    # 6. Generate JWT
    jwt_token = create_access_token(str(user.id), user.role.value)

    return {
        "token": jwt_token,
        "username": user.username,
    }
