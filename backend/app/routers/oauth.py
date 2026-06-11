"""OAuth social login routes — authorize redirect + callback handler."""

from typing import Any
from urllib.parse import quote, urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.oauth_service import get_authorize_url, handle_oauth_callback

router = APIRouter()
settings = get_settings()


@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(provider: str) -> Any:
    """Redirect the user to the OAuth provider's authorization page."""
    url = get_authorize_url(provider)
    return RedirectResponse(url=url, status_code=302)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Handle the OAuth callback from the provider.
    Exchanges the authorization code for a token, finds or creates the user,
    then redirects to the frontend with the JWT.
    """
    frontend_url = settings.FRONTEND_URL

    # Provider returned an error (e.g. user denied access)
    if error:
        msg = error_description or error
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error={quote(msg)}"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error={quote('Missing code or state parameter.')}"
        )

    try:
        result = await handle_oauth_callback(provider, code, state, db)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else "Authentication failed."
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error={quote(detail)}"
        )
    except Exception:
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error={quote('An unexpected error occurred. Please try again.')}"
        )

    params = urlencode({"token": result["token"], "username": result["username"]})
    return RedirectResponse(url=f"{frontend_url}/auth/callback?{params}")
