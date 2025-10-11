"""Celery task for generating weekly summaries."""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

from celery import Celery

from ..db import queries
from ..services.summarizer import get_weekly_summarizer


celery_app = Celery("echo.summary")
celery_app.conf.update(
    broker_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    result_backend=None,
    task_serializer="json",
)


@celery_app.task(name="echo.generate_weekly_summary")
def generate_weekly_summary(user_id: str) -> dict:
    since = datetime.now(UTC) - timedelta(days=7)
    entries = queries.fetch_entries_since(user_id, since)
    summarizer = get_weekly_summarizer()
    summary_text = summarizer.summarize(entries)
    week_start = (datetime.now(UTC) - timedelta(days=datetime.now(UTC).weekday())).date()
    record = queries.upsert_summary(
        user_id=user_id,
        week_start=week_start,
        summary_text=summary_text,
    )
    return {"summary_text": record["summary_text"], "week_start": str(record["week_start"])}
