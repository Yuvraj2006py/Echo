"\"\"\"Weekly reporting helpers.\"\"\""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Sequence

from .triggers import tokenize


def _filter_entries_by_user(
    entries: Sequence[Mapping[str, Any]], user_id: str, week_start: date, week_end: date
) -> List[Mapping[str, Any]]:
    filtered: List[Mapping[str, Any]] = []
    for entry in entries:
        if entry.get("user_id") != user_id:
            continue
        created_at_raw = entry.get("created_at")
        if not created_at_raw:
            continue
        created_at = (
            created_at_raw
            if isinstance(created_at_raw, datetime)
            else datetime.fromisoformat(str(created_at_raw).replace("Z", "+00:00"))
        )
        entry_date = created_at.date()
        if week_start <= entry_date <= week_end:
            filtered.append(entry)
    return filtered


def _keyword_stats(
    entries: Sequence[Mapping[str, Any]], max_terms: int = 30
) -> List[Dict[str, Any]]:
    counts: Counter[str] = Counter()
    sentiment_totals: MutableMapping[str, float] = defaultdict(float)
    for entry in entries:
        words = tokenize(entry.get("text", ""))
        sentiment = float(entry.get("sentiment_score") or 0.0)
        for word in words:
            counts[word] += 1
            sentiment_totals[word] += sentiment
    top_terms = counts.most_common(max_terms)
    return [
        {
            "term": term,
            "count": int(count),
            "avg_sentiment": sentiment_totals[term] / count if count else 0.0,
        }
        for term, count in top_terms
    ]


def _notable_spikes(
    daily_metrics: Sequence[Mapping[str, Any]],
    week_start: date,
    week_end: date,
    threshold: float = 1.5,
) -> List[Dict[str, Any]]:
    values: List[float] = []
    per_day: List[tuple[date, float]] = []
    for record in daily_metrics:
        record_date_raw = record.get("date")
        if not record_date_raw:
            continue
        record_date = (
            record_date_raw
            if isinstance(record_date_raw, date)
            else datetime.fromisoformat(str(record_date_raw)).date()
        )
        if not (week_start <= record_date <= week_end):
            continue
        sentiment = record.get("avg_sentiment")
        if sentiment is None:
            continue
        per_day.append((record_date, float(sentiment)))
        values.append(float(sentiment))
    if len(values) < 2:
        return []
    mean_val = sum(values) / len(values)
    variance = sum((val - mean_val) ** 2 for val in values) / len(values)
    std_dev = variance ** 0.5
    if std_dev == 0:
        return []
    spikes: List[Dict[str, Any]] = []
    for record_date, val in per_day:
        zscore = (val - mean_val) / std_dev
        if abs(zscore) >= threshold:
            spikes.append(
                {
                    "date": record_date.isoformat(),
                    "avg_sentiment": val,
                    "zscore": zscore,
                }
            )
    return spikes


def build_weekly_metrics_payload(
    *,
    user_id: str,
    week_start: date,
    week_end: date,
    weekly_record: Mapping[str, Any],
    previous_week_record: Mapping[str, Any] | None,
    entries: Sequence[Mapping[str, Any]],
    daily_records: Sequence[Mapping[str, Any]],
) -> Dict[str, Any]:
    filtered_entries = _filter_entries_by_user(entries, user_id, week_start, week_end)
    emotion_counts = weekly_record.get("emotion_counts") or {}
    message_count = int(weekly_record.get("message_count") or 0)
    avg_sentiment = float(weekly_record.get("avg_sentiment") or 0.0)
    volatility = float(weekly_record.get("volatility") or 0.0)
    corr_summary = weekly_record.get("corr_summary") or {}

    prev_avg = None
    if previous_week_record and previous_week_record.get("avg_sentiment") is not None:
        prev_avg = float(previous_week_record["avg_sentiment"])

    delta_vs_prev = avg_sentiment - prev_avg if prev_avg is not None else None

    top_emotion = None
    if emotion_counts:
        top_emotion = max(emotion_counts.items(), key=lambda item: item[1])[0]

    keyword_stats = _keyword_stats(filtered_entries)
    spikes = _notable_spikes(daily_records, week_start, week_end)

    return {
        "week_range": {"start": week_start.isoformat(), "end": week_end.isoformat()},
        "avg_sentiment": avg_sentiment,
        "delta_vs_prev_week": delta_vs_prev,
        "emotion_counts": emotion_counts,
        "message_count": message_count,
        "top_emotion": top_emotion,
        "volatility": volatility,
        "time_of_day_means": corr_summary.get("time_of_day_mean_sentiment", {}),
        "weekday_means": corr_summary.get("weekday_mean_sentiment", {}),
        "correlations": {
            "entry_length_vs_sentiment_pearson": corr_summary.get(
                "entry_length_vs_sentiment_pearson"
            ),
            "entry_length_sample_size": corr_summary.get("entry_length_sample_size"),
        },
        "top_keywords": keyword_stats,
        "notable_spikes": spikes,
    }
