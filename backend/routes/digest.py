"""Weekly digest email endpoint."""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..core import rate_limit_write
from ..db import queries
from ..services.auth import AuthenticatedUser, get_current_user
from ..services.insights import summarize_entries
from ..services.summarizer import get_weekly_summarizer


router = APIRouter(prefix="/digest", tags=["digest"])

@router.get("/pref")
def get_digest_pref_route(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    enabled = queries.get_digest_pref(user.id)
    return {"enabled": enabled if enabled is not None else True}


@router.post("/pref")
@rate_limit_write()
def set_digest_pref_route(
    request: Request,
    payload: dict = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    enabled = bool(payload.get("enabled", True))
    value = queries.set_digest_pref(user.id, enabled)
    return {"enabled": value}

def _format_digest_body(*, user_email: str, summary: str, insights: dict, coping_actions: List[str]) -> str:
    top_emotions = insights.get("top_emotions", [])[:3]
    emotion_lines = ", ".join(f"{item['label']} {item['pct']}%" for item in top_emotions) or "No data"
    coping_line = coping_actions[0] if coping_actions else "Pick a coping action to pin this week."
    return (
        f"Hi {user_email},\n\n"
        "Here's your Echo weekly check-in:\n\n"
        f"Highlights: {emotion_lines}\n"
        f"Coping spotlight: {coping_line}\n\n"
        f"Weekly summary:\n{summary}\n\n"
        "Open your dashboard for charts and context: https://echo.app/dashboard\n\n"
        "Stay gentle,\nEcho"
    )


@router.post("/send-now")
@rate_limit_write()
def send_digest_now(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="SendGrid API key not configured.")

    if not user.email:
        raise HTTPException(status_code=400, detail="User email unavailable for digest.")

    pref = queries.get_digest_pref(user.id)
    if pref is False:
        return {"ok": False, "reason": "Digest disabled"}

    since = datetime.now(UTC) - timedelta(days=7)
    entries = queries.fetch_entries_since(user.id, since)
    insights = summarize_entries(entries)
    summarizer = get_weekly_summarizer()
    summary_text = summarizer.summarize(entries)

    coping_actions = queries.get_coping_kit(user.id) or []

    body = _format_digest_body(
        user_email=user.email,
        summary=summary_text,
        insights=insights,
        coping_actions=coping_actions,
    )

    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL", "echo@no-reply.dev"),
        to_emails=user.email,
        subject="Your Echo weekly digest",
        plain_text_content=body,
    )

    try:
        client = SendGridAPIClient(api_key)
        client.send(message)
    except Exception as exc:  # pragma: no cover - network integration
        raise HTTPException(status_code=502, detail=f"Failed to send digest: {exc}") from exc

    return {"ok": True}
