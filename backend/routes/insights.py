"""Insights endpoints for charts and heatmaps."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query

from ..db import queries
from ..services.auth import AuthenticatedUser, get_current_user
from ..services.insights import summarize_entries


router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/summary")
def get_insights_summary(
    days: int = Query(default=7, ge=1, le=365),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    now = datetime.now(UTC)
    since = now - timedelta(days=days)
    entries = queries.fetch_entries_since(user.id, since)
    return summarize_entries(entries)
