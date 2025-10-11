from datetime import datetime, timezone

import pytest

from backend.services import analytics


def _entry(
    *, user_id: str, created_at: str, emotion_label: str, score: float, sentiment: float | None = None, length: int = 10, time_of_day: str | None = None
):
    return {
        "user_id": user_id,
        "created_at": created_at,
        "emotion_json": [{"label": emotion_label, "score": score}],
        "sentiment_score": sentiment,
        "entry_length": length,
        "time_of_day": time_of_day,
    }


def test_compute_daily_metrics_aggregates_values() -> None:
    entries = [
        _entry(
            user_id="user-1",
            created_at="2025-10-06T09:00:00+00:00",
            emotion_label="joy",
            score=0.9,
            sentiment=0.8,
            length=50,
            time_of_day="Morning",
        ),
        _entry(
            user_id="user-1",
            created_at="2025-10-06T13:00:00+00:00",
            emotion_label="sadness",
            score=0.7,
            sentiment=-0.5,
            length=100,
            time_of_day="Afternoon",
        ),
    ]

    daily = analytics.compute_daily_metrics(entries)
    assert len(daily) == 1
    record = daily[0]
    assert record["user_id"] == "user-1"
    assert record["date"] == "2025-10-06"
    assert record["message_count"] == 2
    assert pytest.approx(record["avg_sentiment"], rel=1e-3) == 0.15
    assert record["emotion_counts"]["joy"] == 1
    assert record["emotion_counts"]["sadness"] == 1
    assert pytest.approx(record["avg_entry_length"], rel=1e-3) == 75.0
    assert record["time_buckets"]["Morning"]["message_count"] == 1
    assert pytest.approx(record["time_buckets"]["Morning"]["avg_sentiment"], rel=1e-3) == 0.8


def test_compute_weekly_metrics_builds_correlations() -> None:
    entries = [
        _entry(
            user_id="user-1",
            created_at="2025-10-06T09:00:00+00:00",
            emotion_label="joy",
            score=0.9,
            sentiment=0.8,
            length=50,
            time_of_day="Morning",
        ),
        _entry(
            user_id="user-1",
            created_at="2025-10-07T18:00:00+00:00",
            emotion_label="sadness",
            score=0.7,
            sentiment=-0.5,
            length=120,
            time_of_day="Evening",
        ),
    ]

    daily = analytics.compute_daily_metrics(entries)
    weekly = analytics.compute_weekly_metrics(entries, daily)
    assert len(weekly) == 1
    record = weekly[0]
    assert record["week_start"] == "2025-10-06"
    assert record["message_count"] == 2
    assert "entry_length_vs_sentiment_pearson" in record["corr_summary"]
    pearson = record["corr_summary"]["entry_length_vs_sentiment_pearson"]
    assert pearson is not None
    assert record["emotion_counts"]["joy"] == 1
    assert record["emotion_counts"]["sadness"] == 1
    assert "Morning" in record["corr_summary"]["time_of_day_mean_sentiment"]
    assert "Mon" in record["corr_summary"]["weekday_mean_sentiment"]
