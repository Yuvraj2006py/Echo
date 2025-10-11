"""
Convenience wrappers around Supabase queries used by the Echo backend.

The functions in this module intentionally return plain Python data structures
so they can be consumed easily by FastAPI route handlers and services.
"""

from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Sequence

from .supabase import get_client


class DatabaseError(RuntimeError):
    """Raised when a Supabase operation fails."""


def _ensure_response(data: Any) -> List[Dict[str, Any]]:
    if not isinstance(data, list):
        raise DatabaseError("Unexpected Supabase response payload.")
    return data


def insert_entry(
    *,
    user_id: str,
    text: str,
    source: str,
    tags: Optional[List[str]],
    emotion_json: Optional[List[Dict[str, Any]]] = None,
    ai_response: Optional[str] = None,
    entry_length: Optional[int] = None,
    time_of_day: Optional[str] = None,
    weekday: Optional[int] = None,
    response_delay_ms: Optional[int] = None,
    sentiment_score: Optional[float] = None,
    embedding: Optional[List[float]] = None,
    created_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    client = get_client()
    payload = {
        "user_id": user_id,
        "text": text,
        "source": source,
        "tags": tags or [],
        "emotion_json": emotion_json or [],
    }
    if ai_response is not None:
        payload["ai_response"] = ai_response
    if entry_length is not None:
        payload["entry_length"] = entry_length
    if time_of_day is not None:
        payload["time_of_day"] = time_of_day
    if weekday is not None:
        payload["weekday"] = weekday
    if response_delay_ms is not None:
        payload["response_delay_ms"] = response_delay_ms
    if sentiment_score is not None:
        payload["sentiment_score"] = sentiment_score
    if embedding is not None:
        payload["embedding"] = embedding
    if created_at is not None:
        payload["created_at"] = created_at.isoformat()
    response = client.table("entries").insert(payload).execute()
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to insert entry.")
    return rows[0]


def update_entry_emotions(
    entry_id: str, emotion_json: List[Dict[str, Any]], ai_response: Optional[str] = None
) -> Dict[str, Any]:
    client = get_client()
    update_payload: Dict[str, Any] = {"emotion_json": emotion_json}
    if ai_response is not None:
        update_payload["ai_response"] = ai_response
    response = (
        client.table("entries")
        .update(update_payload)
        .eq("id", entry_id)
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to update entry emotion data.")
    return rows[0]


def get_entries(user_id: str, *, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("entries")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return _ensure_response(response.data)


def get_entry(user_id: str, entry_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("entries")
        .select("*")
        .eq("user_id", user_id)
        .eq("id", entry_id)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    return rows[0] if rows else None


def fetch_entries_since(user_id: str, since: datetime) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("entries")
        .select("*")
        .eq("user_id", user_id)
        .gte("created_at", since.isoformat())
        .order("created_at", desc=True)
        .execute()
    )
    return _ensure_response(response.data)


def fetch_entries_for_range(
    user_id: str, *, start: datetime, end: datetime
) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("entries")
        .select("*")
        .eq("user_id", user_id)
        .gte("created_at", start.isoformat())
        .lte("created_at", end.isoformat())
        .order("created_at")
        .execute()
    )
    return _ensure_response(response.data)


def fetch_entries_for_range_all(
    *, start: datetime, end: datetime
) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("entries")
        .select("*")
        .gte("created_at", start.isoformat())
        .lte("created_at", end.isoformat())
        .order("created_at")
        .execute()
    )
    return _ensure_response(response.data)


def upsert_summary(
    *,
    user_id: str,
    week_start: date,
    summary_text: str,
) -> Dict[str, Any]:
    client = get_client()
    response = (
        client.table("summaries")
        .upsert(
            {
                "user_id": user_id,
                "week_start": week_start.isoformat(),
                "summary_text": summary_text,
            },
            on_conflict="user_id,week_start",
            returning="representation",
        )
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to upsert weekly summary.")
    return rows[0]


def get_latest_summary(user_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("summaries")
        .select("*")
        .eq("user_id", user_id)
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    return rows[0] if rows else None


def get_coping_kit(user_id: str) -> Optional[List[str]]:
    client = get_client()
    response = (
        client.table("coping_kits")
        .select("actions")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        return None
    return rows[0].get("actions") or []


def save_coping_kit(user_id: str, actions: List[str]) -> List[str]:
    client = get_client()
    response = (
        client.table("coping_kits")
        .upsert(
            {"user_id": user_id, "actions": actions},
            on_conflict="user_id",
            returning="representation",
        )
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to save coping kit.")
    return rows[0].get("actions") or []


def list_triggers(user_id: str) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("triggers")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return _ensure_response(response.data)


def upsert_trigger(
    *,
    user_id: str,
    name: str,
    words: List[str],
) -> Dict[str, Any]:
    client = get_client()
    response = (
        client.table("triggers")
        .upsert(
            {
                "user_id": user_id,
                "name": name,
                "words": words,
            },
            on_conflict="user_id,name",
            returning="representation",
        )
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to upsert trigger.")
    return rows[0]


def get_digest_pref(user_id: str) -> Optional[bool]:
    client = get_client()
    response = (
        client.table("digest_prefs")
        .select("weekly_email_enabled")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        return None
    return bool(rows[0].get("weekly_email_enabled", True))


def set_digest_pref(user_id: str, enabled: bool) -> bool:
    client = get_client()
    response = (
        client.table("digest_prefs")
        .upsert(
            {"user_id": user_id, "weekly_email_enabled": enabled},
            on_conflict="user_id",
            returning="representation",
        )
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to update digest preference.")
    return bool(rows[0].get("weekly_email_enabled", enabled))


def get_calendar_token(user_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("calendar_tokens")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    return rows[0] if rows else None


def save_calendar_token(
    *,
    user_id: str,
    provider: str,
    access_token: str,
    refresh_token: str,
) -> Dict[str, Any]:
    client = get_client()
    response = (
        client.table("calendar_tokens")
        .upsert(
            {
                "user_id": user_id,
                "provider": provider,
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
            on_conflict="user_id",
            returning="representation",
        )
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to store calendar token.")
    return rows[0]


def delete_calendar_token(user_id: str) -> None:
    client = get_client()
    client.table("calendar_tokens").delete().eq("user_id", user_id).execute()

def upsert_daily_metrics(records: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not records:
        return []
    client = get_client()
    response = (
        client.table("daily_metrics")
        .upsert(records, on_conflict="user_id,date", returning="representation")
        .execute()
    )
    return _ensure_response(response.data)


def get_daily_metrics(user_id: str, start: date, end: date) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("daily_metrics")
        .select("*")
        .eq("user_id", user_id)
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .order("date")
        .execute()
    )
    return _ensure_response(response.data)


def upsert_weekly_metrics(records: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not records:
        return []
    client = get_client()
    response = (
        client.table("weekly_metrics")
        .upsert(records, on_conflict="user_id,week_start", returning="representation")
        .execute()
    )
    return _ensure_response(response.data)


def get_weekly_metrics(user_id: str, start: date, end: date) -> List[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("weekly_metrics")
        .select("*")
        .eq("user_id", user_id)
        .gte("week_start", start.isoformat())
        .lte("week_start", end.isoformat())
        .order("week_start")
        .execute()
    )
    return _ensure_response(response.data)


def get_latest_weekly_summary(user_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("weekly_summary")
        .select("*")
        .eq("user_id", user_id)
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    return rows[0] if rows else None


def get_previous_weekly_summary(user_id: str, before: date) -> Optional[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("weekly_summary")
        .select("*")
        .eq("user_id", user_id)
        .lt("week_start", before.isoformat())
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    return rows[0] if rows else None


def upsert_weekly_summary(record: Dict[str, Any]) -> Dict[str, Any]:
    client = get_client()
    response = (
        client.table("weekly_summary")
        .upsert(record, on_conflict="user_id,week_start", returning="representation")
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to upsert weekly summary.")
    return rows[0]


def get_profile(user_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    response = (
        client.table("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = _ensure_response(response.data)
    return rows[0] if rows else None


def upsert_profile(user_id: str, full_name: str) -> Dict[str, Any]:
    client = get_client()
    response = (
        client.table("user_profiles")
        .upsert(
            {"user_id": user_id, "full_name": full_name},
            on_conflict="user_id",
            returning="representation",
        )
        .execute()
    )
    rows = _ensure_response(response.data)
    if not rows:
        raise DatabaseError("Failed to upsert profile.")
    return rows[0]
