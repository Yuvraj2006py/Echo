"""Celery task for sending weekly digest emails."""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

from celery import Celery
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..db import queries
from ..services.insights import summarize_entries
from ..services.summarizer import get_weekly_summarizer


celery_app = Celery("echo.digest")
celery_app.conf.update(
    broker_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    result_backend=None,
    task_serializer="json",
)


def _build_email_body(user_email: str, summary: str, insights: dict) -> str:
    top = ", ".join(
        f"{item['label']}: {item['pct']}%"
        for item in insights.get("top_emotions", [])[:3]
    ) or "No data yet."
    return (
        f"Hi {user_email},\n\n"
        f"Here's your Echo weekly snapshot:\n"
        f"- Top emotions: {top}\n"
        f"- Weekly summary: {summary}\n\n"
        "View full insights: https://echo.app/dashboard\n\n"
        "- Echo"
    )


@celery_app.task(name="echo.send_weekly_digest")
def send_weekly_digest(user_id: str, user_email: str) -> bool:
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        return False

    pref = queries.get_digest_pref(user_id)
    if pref is False:
        return False

    since = datetime.now(UTC) - timedelta(days=7)
    entries = queries.fetch_entries_since(user_id, since)
    insights = summarize_entries(entries)

    summarizer = get_weekly_summarizer()
    summary_text = summarizer.summarize(entries)

    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL", "echo@no-reply.dev"),
        to_emails=user_email,
        subject="Your Echo weekly digest",
        plain_text_content=_build_email_body(user_email, summary_text, insights),
    )

    client = SendGridAPIClient(api_key)
    client.send(message)
    return True
