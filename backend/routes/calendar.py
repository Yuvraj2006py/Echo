"""Read-only Google Calendar bridge with OAuth helpers."""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Tuple
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from jwt import PyJWTError

from ..core import rate_limit_auth, rate_limit_write
from ..db import queries
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/calendar", tags=["calendar"])

GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
STATE_TTL_MINUTES = 10
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


def _iso_date_range(from_str: str, to_str: str) -> Tuple[str, str]:
    try:
        start = datetime.fromisoformat(from_str).date()
        end = datetime.fromisoformat(to_str).date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format.") from exc
    if end < start:
        raise HTTPException(status_code=400, detail="`to` must be after `from`.")
    start_iso = f"{start.isoformat()}T00:00:00Z"
    end_iso = f"{end.isoformat()}T23:59:59Z"
    return start_iso, end_iso


def _ensure_google_config() -> Tuple[str, str]:
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")
    return client_id, client_secret


def _state_secret() -> str:
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="State signing secret unavailable.")
    return secret


def _default_redirect_uri(request: Request) -> str:
    return str(request.url_for("calendar_oauth_callback"))


def _render_popup_response(success: bool, origin: str | None, message: str) -> HTMLResponse:
    target_origin = origin or "*"
    payload_type = "echo-calendar-connected" if success else "echo-calendar-error"
    html = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Echo Calendar</title>
    <style>
      body {{ font-family: system-ui, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; }}
      main {{ max-width: 420px; margin: 0 auto; text-align: center; }}
    </style>
  </head>
  <body>
    <main>
      <h2>{'Calendar connected 🎉' if success else 'Calendar connection failed'}</h2>
      <p>{message}</p>
      <p>You can close this window.</p>
    </main>
    <script>
      try {{
        window.opener && window.opener.postMessage({{ type: "{payload_type}" }}, "{target_origin}");
      }} catch (error) {{}}
      setTimeout(function () {{ window.close(); }}, 1500);
    </script>
  </body>
</html>
"""
    return HTMLResponse(content=html)


async def _refresh_token(token_record: Dict[str, Any]) -> Dict[str, Any]:
    refresh_token = token_record.get("refresh_token")
    client_id, client_secret = _ensure_google_config()
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Google Calendar refresh unavailable.")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to refresh Google token.")
    data = response.json()
    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Google token response incomplete.")
    updated = queries.save_calendar_token(
        user_id=token_record["user_id"],
        provider=token_record.get("provider", "google"),
        access_token=access_token,
        refresh_token=refresh_token,
    )
    return updated


async def _fetch_events(access_token: str, time_min: str, time_max: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "singleEvents": "true",
        "orderBy": "startTime",
        "timeMin": time_min,
        "timeMax": time_max,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(GOOGLE_EVENTS_URL, headers=headers, params=params)
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="expired_token")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch Google events.")
    items = response.json().get("items", [])
    events: list[dict] = []
    for item in items:
        start = item.get("start", {})
        end = item.get("end", {})
        events.append(
            {
                "id": item.get("id"),
                "title": item.get("summary") or "Untitled event",
                "start": start.get("dateTime") or start.get("date"),
                "end": end.get("dateTime") or end.get("date"),
            }
        )
    return events


@router.get("/oauth/start")
@rate_limit_auth()
async def start_oauth(
    request: Request,
    origin: str | None = Query(default=None),
    user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, str]:
    client_id, _ = _ensure_google_config()
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI") or _default_redirect_uri(request)

    request_origin = request.headers.get("origin")
    allowed_origin = origin or request_origin or ""
    if origin and request_origin and origin != request_origin:
        raise HTTPException(status_code=400, detail="Origin mismatch.")

    payload: Dict[str, Any] = {
        "sub": user.id,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=STATE_TTL_MINUTES),
    }
    if allowed_origin:
        payload["origin"] = allowed_origin

    state = jwt.encode(payload, _state_secret(), algorithm="HS256")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": CALENDAR_SCOPE,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    authorize_url = f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}"
    return {"authorize_url": authorize_url}


@router.get("/oauth/callback", name="calendar_oauth_callback")
async def oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> HTMLResponse:
    origin_hint = None
    if not state:
        return _render_popup_response(False, origin_hint, "Missing OAuth state parameter.")
    try:
        decoded = jwt.decode(state, _state_secret(), algorithms=["HS256"])
    except PyJWTError:
        return _render_popup_response(False, origin_hint, "Invalid or expired OAuth state.")

    user_id = decoded.get("sub")
    origin_hint = decoded.get("origin")

    if not user_id:
        return _render_popup_response(False, origin_hint, "Missing user context in OAuth state.")
    if error:
        return _render_popup_response(False, origin_hint, f"Google returned an error: {error}")
    if not code:
        return _render_popup_response(False, origin_hint, "Missing authorization code from Google.")

    client_id, client_secret = _ensure_google_config()
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI") or _default_redirect_uri(request)

    token_payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post(GOOGLE_TOKEN_URL, data=token_payload)
    if token_response.status_code != 200:
        return _render_popup_response(False, origin_hint, "Failed to exchange authorization code.")
    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    if not access_token:
        return _render_popup_response(False, origin_hint, "Google response did not include an access token.")

    existing = queries.get_calendar_token(user_id)
    if not refresh_token and existing:
        refresh_token = existing.get("refresh_token")
    if not refresh_token:
        return _render_popup_response(False, origin_hint, "Google response did not include a refresh token.")

    queries.save_calendar_token(
        user_id=user_id,
        provider="google",
        access_token=access_token,
        refresh_token=refresh_token,
    )

    return _render_popup_response(True, origin_hint, "Echo can now sync your events to surface correlations.")


@router.get("/status")
def calendar_status(user: AuthenticatedUser = Depends(get_current_user)) -> Dict[str, bool]:
    record = queries.get_calendar_token(user.id)
    return {"connected": bool(record)}


@router.delete("/disconnect")
@rate_limit_write()
def calendar_disconnect(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, bool]:
    queries.delete_calendar_token(user.id)
    return {"ok": True}


@router.get("/events")
async def get_events(
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    user: AuthenticatedUser = Depends(get_current_user),
) -> list[dict]:
    token_record = queries.get_calendar_token(user.id)
    if not token_record:
        return []

    time_min, time_max = _iso_date_range(from_date, to_date)
    try:
        return await _fetch_events(token_record["access_token"], time_min, time_max)
    except HTTPException as exc:
        if exc.status_code == 401 and exc.detail == "expired_token":
            refreshed = await _refresh_token(token_record)
            return await _fetch_events(refreshed["access_token"], time_min, time_max)
        raise
