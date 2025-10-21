"""Analytics API endpoints."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from ..core import rate_limit_write
from ..db import queries
from ..services import analytics as analytics_service
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/analytics", tags=["analytics"])


def _parse_date(value: Optional[str], default: date) -> date:
    if not value:
        return default
    return datetime.fromisoformat(value).date()


def _date_range(start: Optional[str], end: Optional[str], default_span_days: int = 30) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    default_start = today - timedelta(days=default_span_days - 1)
    start_date = _parse_date(start, default_start)
    end_date = _parse_date(end, today)
    if start_date > end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start must be <= end")
    return start_date, end_date


@router.get("/daily")
def get_daily_analytics(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    user: AuthenticatedUser = Depends(get_current_user),
) -> List[dict]:
    start_date, end_date = _date_range(start, end)
    return queries.get_daily_metrics(user.id, start_date, end_date)


@router.get("/weekly")
def get_weekly_analytics(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    user: AuthenticatedUser = Depends(get_current_user),
) -> List[dict]:
    start_date, end_date = _date_range(start, end, default_span_days=70)
    return queries.get_weekly_metrics(user.id, start_date, end_date)


@router.post("/recompute")
@rate_limit_write()
def recompute_analytics(
    request: Request,
    scope: Literal["daily", "weekly"] = Query(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    now = datetime.now(timezone.utc)
    if scope == "daily":
        start = now - timedelta(days=30)
        records = analytics_service.recompute_daily_metrics(user.id, start, now)
        return {"scope": "daily", "rows": len(records)}
    if scope == "weekly":
        start = now - timedelta(days=90)
        records = analytics_service.recompute_weekly_metrics(user.id, start, now)
        return {"scope": "weekly", "rows": len(records)}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported scope")
