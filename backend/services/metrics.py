"""Utility helpers for deriving behavioral metrics on journal entries."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Mapping

EMOTION_SENTIMENT_WEIGHTS: Mapping[str, float] = {
    "joy": 0.9,
    "love": 0.85,
    "calm": 0.6,
    "proud": 0.7,
    "grateful": 0.75,
    "surprise": 0.2,
    "hopeful": 0.55,
    "neutral": 0.0,
    "content": 0.45,
    "sadness": -0.6,
    "anger": -0.7,
    "fear": -0.65,
    "anxiety": -0.7,
    "frustrated": -0.55,
    "disgust": -0.5,
    "tired": -0.4,
    "overwhelmed": -0.6,
    "stress": -0.6,
}


def ensure_utc(dt: datetime) -> datetime:
    """Return a timezone-aware datetime in UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def calculate_entry_length(text: str) -> int:
    """Return the character length of the supplied text, ignoring surrounding whitespace."""
    return len((text or "").strip())


def bucket_time_of_day(dt: datetime) -> str:
    """Return the label for the time-of-day bucket the datetime falls into."""
    hour = ensure_utc(dt).hour
    if hour < 5:
        return "Night"
    if hour < 12:
        return "Morning"
    if hour < 17:
        return "Afternoon"
    if hour < 21:
        return "Evening"
    return "Night"


def weekday_index(dt: datetime) -> int:
    """Return Python weekday index (Mon=0..Sun=6)."""
    return ensure_utc(dt).weekday()


def sentiment_from_emotions(emotions: Iterable[Mapping[str, float]]) -> float:
    """Compute a sentiment score in [-1, 1] from a collection of emotion scores."""
    weighted_total = 0.0
    score_total = 0.0
    for emotion in emotions:
        label = str(emotion.get("label", "")).lower()
        weight = EMOTION_SENTIMENT_WEIGHTS.get(label, 0.0)
        score = float(emotion.get("score", 0.0))
        weighted_total += weight * score
        score_total += score

    if score_total <= 0:
        return 0.0
    sentiment = weighted_total / score_total
    # Clamp to [-1, 1] to avoid any floating point noise escaping range.
    return max(-1.0, min(1.0, sentiment))
