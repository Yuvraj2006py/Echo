"""Aggregate insights for the Echo dashboard."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, Iterable, List, Sequence

from .triggers import tokenize


def _parse_created_at(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass
    raise ValueError("Unsupported created_at format.")


def _top_emotion(emotions: Iterable[Dict[str, Any]]) -> str:
    items = sorted(emotions, key=lambda item: item.get("score", 0), reverse=True)
    return (items[0].get("label") if items else "neutral") or "neutral"


def summarize_entries(entries: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    if not entries:
        return {
            "top_emotions": [],
            "trend": [],
            "keywords": [],
            "heatmap": [],
        }

    emotion_totals: Counter[str] = Counter()
    daily_emotions: Dict[str, Counter[str]] = defaultdict(Counter)
    keyword_counter: Counter[str] = Counter()

    for entry in entries:
        created_at = _parse_created_at(entry.get("created_at"))
        day_key = created_at.date().isoformat()
        emotions = entry.get("emotion_json") or []
        top_label = _top_emotion(emotions).lower()
        emotion_totals[top_label] += 1
        daily_emotions[day_key][top_label] += 1

        keyword_counter.update(tokenize(entry.get("text", "")))
        for tag in entry.get("tags") or []:
            keyword_counter[tag.lower()] += 0.5

    total = sum(emotion_totals.values()) or 1
    top_emotions = [
        {"label": label, "pct": round((count / total) * 100, 1)}
        for label, count in emotion_totals.most_common()
    ]

    trend: List[Dict[str, Any]] = []
    for day in sorted(daily_emotions.keys()):
        data = {"date": day}
        total_day = sum(daily_emotions[day].values()) or 1
        for label, count in daily_emotions[day].items():
            data[label] = round(count / total_day, 3)
        trend.append(data)

    heatmap = [
        {
            "date": day,
            "dominant_label": counter.most_common(1)[0][0],
        }
        for day, counter in sorted(daily_emotions.items())
    ]

    keywords = [
        {"word": word, "count": int(count)}
        for word, count in keyword_counter.most_common(20)
    ]

    return {
        "top_emotions": top_emotions,
        "trend": trend,
        "keywords": keywords,
        "heatmap": heatmap,
    }
