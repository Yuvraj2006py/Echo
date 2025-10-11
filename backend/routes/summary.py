"Weekly summary endpoint."

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any, Dict, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..db import queries
from ..services.auth import AuthenticatedUser, get_current_user
from ..services.summarizer import get_weekly_summarizer


router = APIRouter(prefix="/summary", tags=["summary"])


class SummaryResponse(BaseModel):
    summary_text: str
    week_start: str


PERIOD_TO_DAYS: dict[str, int | None] = {"day": 1, "week": 7, "month": None}


@router.get("", response_model=SummaryResponse)
def get_summary(
    period: Literal["day", "week", "month"] = Query(default="week"),
    user: AuthenticatedUser = Depends(get_current_user),
) -> SummaryResponse:
    now = datetime.now(UTC)
    if period == "day":
        window_start_dt = datetime(now.year, now.month, now.day, tzinfo=UTC)
        since = window_start_dt
    elif period == "week":
        window_start_dt = datetime(now.year, now.month, now.day, tzinfo=UTC) - timedelta(days=now.weekday())
        since = now - timedelta(days=7)
    else:  # month
        window_start_dt = datetime(now.year, now.month, 1, tzinfo=UTC)
        since = window_start_dt

    entries = queries.fetch_entries_since(user.id, since)
    summarizer = get_weekly_summarizer()
    summary_text = summarizer.summarize(entries, timeframe=period)

    if period == "week":
        record = queries.upsert_summary(
            user_id=user.id,
            week_start=window_start_dt.date(),
            summary_text=summary_text,
        )
        return SummaryResponse(
            summary_text=record["summary_text"],
            week_start=str(record["week_start"]),
        )

    return SummaryResponse(summary_text=summary_text, week_start=str(window_start_dt.date()))


@router.get("/weekly/latest")
def get_latest_weekly_summary(
    include_previous: bool = Query(default=False),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    record = queries.get_latest_weekly_summary(user.id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No weekly summary found.")
    response: Dict[str, Any] = {"current": record}
    if include_previous:
        week_start_raw = record.get("week_start")
        if week_start_raw:
            week_start_date = (
                week_start_raw
                if isinstance(week_start_raw, date)
                else datetime.fromisoformat(str(week_start_raw)).date()
            )
            previous = queries.get_previous_weekly_summary(user.id, week_start_date)
            if previous:
                response["previous"] = previous
    return response
