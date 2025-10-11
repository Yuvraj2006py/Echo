"\"\"\"Analytics aggregation helpers for Echo.\"\"\""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from math import sqrt
from statistics import pstdev
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

from ..db import queries
from . import metrics


def _parse_created_at(value: Any) -> datetime:
    if isinstance(value, datetime):
        return metrics.ensure_utc(value)
    if isinstance(value, str):
        return metrics.ensure_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))
    raise ValueError("Unsupported created_at format.")


def _top_emotion(emotions: Iterable[Mapping[str, Any]]) -> str:
    best_label = "neutral"
    best_score = float("-inf")
    for emotion in emotions:
        label = str(emotion.get("label", "neutral")).lower() or "neutral"
        score = float(emotion.get("score", 0.0))
        if score > best_score:
            best_score = score
            best_label = label
    return best_label


def _week_bounds(dt: datetime) -> Tuple[date, date]:
    start = metrics.ensure_utc(dt).date()
    start = start - timedelta(days=start.weekday())
    return start, start + timedelta(days=6)


def _pearson(xs: Sequence[float], ys: Sequence[float]) -> float | None:
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den_x = sum((x - mean_x) ** 2 for x in xs)
    den_y = sum((y - mean_y) ** 2 for y in ys)
    if den_x <= 0 or den_y <= 0:
        return None
    return num / sqrt(den_x * den_y)


def compute_daily_metrics(entries: Sequence[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    aggregates: Dict[Tuple[str, date], Dict[str, Any]] = {}

    for entry in entries:
        user_id = entry.get("user_id")
        if not user_id:
            continue

        created_at = _parse_created_at(entry.get("created_at"))
        entry_date = created_at.date()
        key = (user_id, entry_date)
        group = aggregates.setdefault(
            key,
            {
                "sentiments": [],
                "lengths": [],
                "emotion_counts": Counter(),
                "time_bucket_counts": Counter(),
                "time_bucket_sentiments": defaultdict(list),
                "message_count": 0,
            },
        )

        sentiment = entry.get("sentiment_score")
        if sentiment is None and entry.get("emotion_json"):
            sentiment = metrics.sentiment_from_emotions(entry["emotion_json"])

        entry_length = entry.get("entry_length")
        if entry_length is None:
            entry_length = metrics.calculate_entry_length(entry.get("text", ""))

        time_bucket = entry.get("time_of_day") or metrics.bucket_time_of_day(created_at)
        top_emotion = _top_emotion(entry.get("emotion_json") or [])

        group["message_count"] += 1
        group["emotion_counts"][top_emotion] += 1
        group["time_bucket_counts"][time_bucket] += 1

        if entry_length is not None:
            group["lengths"].append(float(entry_length))
        if sentiment is not None:
            group["sentiments"].append(float(sentiment))
            group["time_bucket_sentiments"][time_bucket].append(float(sentiment))

    results: List[Dict[str, Any]] = []
    for (user_id, entry_date), data in sorted(aggregates.items(), key=lambda item: item[0][1]):
        sentiments = data["sentiments"]
        lengths = data["lengths"]
        avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else None
        avg_length = sum(lengths) / len(lengths) if lengths else None
        emotion_counts = dict(data["emotion_counts"])
        top_emotion = max(emotion_counts.items(), key=lambda item: item[1])[0] if emotion_counts else None

        time_buckets: Dict[str, Dict[str, Any]] = {}
        for bucket, count in data["time_bucket_counts"].items():
            bucket_sentiments = data["time_bucket_sentiments"].get(bucket, [])
            time_buckets[bucket] = {
                "message_count": count,
                "avg_sentiment": sum(bucket_sentiments) / len(bucket_sentiments)
                if bucket_sentiments
                else None,
            }

        results.append(
            {
                "user_id": user_id,
                "date": entry_date.isoformat(),
                "avg_sentiment": avg_sentiment,
                "top_emotion": top_emotion,
                "emotion_counts": emotion_counts,
                "message_count": data["message_count"],
                "avg_entry_length": avg_length,
                "time_buckets": time_buckets,
            }
        )

    return results


def compute_weekly_metrics(
    entries: Sequence[Mapping[str, Any]],
    daily_metrics: Sequence[Mapping[str, Any]],
) -> List[Dict[str, Any]]:
    daily_lookup: Dict[Tuple[str, date], Mapping[str, Any]] = {}
    for record in daily_metrics:
        user_id = record.get("user_id")
        record_date_raw = record.get("date")
        if not user_id or not record_date_raw:
            continue
        record_date = (
            record_date_raw
            if isinstance(record_date_raw, date)
            else datetime.fromisoformat(str(record_date_raw)).date()
        )
        daily_lookup[(user_id, record_date)] = record

    aggregates: Dict[Tuple[str, date], Dict[str, Any]] = {}
    for entry in entries:
        user_id = entry.get("user_id")
        if not user_id:
            continue
        created_at = _parse_created_at(entry.get("created_at"))
        week_start, week_end = _week_bounds(created_at)
        key = (user_id, week_start)
        group = aggregates.setdefault(
            key,
            {
                "week_end": week_end,
                "sentiments": [],
                "entry_lengths": [],
                "time_bucket_sentiments": defaultdict(list),
                "weekday_sentiments": defaultdict(list),
                "emotion_counts": Counter(),
                "message_count": 0,
            },
        )

        sentiment = entry.get("sentiment_score")
        if sentiment is None and entry.get("emotion_json"):
            sentiment = metrics.sentiment_from_emotions(entry["emotion_json"])
        entry_length = entry.get("entry_length")
        if entry_length is None:
            entry_length = metrics.calculate_entry_length(entry.get("text", ""))

        time_bucket = entry.get("time_of_day") or metrics.bucket_time_of_day(created_at)
        weekday = entry.get("weekday")
        if weekday is None:
            weekday = metrics.weekday_index(created_at)

        top_emotion = _top_emotion(entry.get("emotion_json") or [])

        group["message_count"] += 1
        group["emotion_counts"][top_emotion] += 1

        if sentiment is not None:
            sentiment = float(sentiment)
            group["sentiments"].append(sentiment)
            group["time_bucket_sentiments"][time_bucket].append(sentiment)
            group["weekday_sentiments"][weekday].append(sentiment)

        if entry_length is not None:
            group["entry_lengths"].append(float(entry_length))

    results: List[Dict[str, Any]] = []
    weekday_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for (user_id, week_start), data in sorted(aggregates.items(), key=lambda item: item[0][1]):
        sentiments = data["sentiments"]
        avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else None
        emotion_counts = dict(data["emotion_counts"])
        message_count = data["message_count"]

        # Volatility from daily averages within the week.
        daily_sentiments: List[float] = []
        for offset in range(7):
            day = week_start + timedelta(days=offset)
            record = daily_lookup.get((user_id, day))
            if record and record.get("avg_sentiment") is not None:
                daily_sentiments.append(float(record["avg_sentiment"]))
        volatility = pstdev(daily_sentiments) if len(daily_sentiments) > 1 else 0.0

        # Correlations and behavioural summaries.
        corr_summary: Dict[str, Any] = {}
        pearson_inputs = list(zip(data["entry_lengths"], data["sentiments"]))
        if pearson_inputs:
            lengths, sentiment_vals = zip(*pearson_inputs)
            corr_summary["entry_length_vs_sentiment_pearson"] = _pearson(lengths, sentiment_vals)
            corr_summary["entry_length_sample_size"] = len(lengths)
        else:
            corr_summary["entry_length_vs_sentiment_pearson"] = None
            corr_summary["entry_length_sample_size"] = 0

        corr_summary["time_of_day_mean_sentiment"] = {
            bucket: (sum(values) / len(values) if values else None)
            for bucket, values in data["time_bucket_sentiments"].items()
        }
        corr_summary["weekday_mean_sentiment"] = {
            weekday_labels[idx]: (sum(values) / len(values) if values else None)
            for idx, values in data["weekday_sentiments"].items()
        }

        results.append(
            {
                "user_id": user_id,
                "week_start": week_start.isoformat(),
                "week_end": data["week_end"].isoformat(),
                "avg_sentiment": avg_sentiment,
                "emotion_counts": emotion_counts,
                "message_count": message_count,
                "volatility": volatility,
                "corr_summary": corr_summary,
            }
        )

    return results


def recompute_daily_metrics(user_id: str, start: datetime, end: datetime) -> List[Dict[str, Any]]:
    entries = queries.fetch_entries_for_range(user_id=user_id, start=start, end=end)
    daily_records = compute_daily_metrics(entries)
    queries.upsert_daily_metrics(daily_records)
    return daily_records


def recompute_weekly_metrics(user_id: str, start: datetime, end: datetime) -> List[Dict[str, Any]]:
    entries = queries.fetch_entries_for_range(user_id=user_id, start=start, end=end)
    daily_records = compute_daily_metrics(entries)
    queries.upsert_daily_metrics(daily_records)
    weekly_records = compute_weekly_metrics(entries, daily_records)
    queries.upsert_weekly_metrics(weekly_records)
    return weekly_records
