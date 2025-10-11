from datetime import datetime, timezone

import pytest

from backend.services import metrics


@pytest.mark.parametrize(
    "text,expected",
    [
        ("hello world", 11),
        ("  padded  ", 6),
        ("", 0),
        ("   ", 0),
    ],
)
def test_calculate_entry_length(text: str, expected: int) -> None:
    assert metrics.calculate_entry_length(text) == expected


@pytest.mark.parametrize(
    "hour,expected",
    [
        (0, "Night"),
        (4, "Night"),
        (7, "Morning"),
        (13, "Afternoon"),
        (18, "Evening"),
        (22, "Night"),
    ],
)
def test_bucket_time_of_day(hour: int, expected: str) -> None:
    dt = datetime(2025, 1, 1, hour=hour, tzinfo=timezone.utc)
    assert metrics.bucket_time_of_day(dt) == expected


def test_weekday_index_returns_python_weekday() -> None:
    dt = datetime(2025, 1, 6, tzinfo=timezone.utc)  # Monday
    assert metrics.weekday_index(dt) == 0


def test_sentiment_from_emotions_weighted_average() -> None:
    emotions = [
        {"label": "joy", "score": 0.6},
        {"label": "fear", "score": 0.4},
    ]
    score = metrics.sentiment_from_emotions(emotions)
    # 0.6*0.9 + 0.4*(-0.65) = 0.54 - 0.26 = 0.28 -> /1.0 = 0.28
    assert pytest.approx(score, rel=1e-3) == 0.28


def test_sentiment_defaults_to_zero_when_no_scores() -> None:
    assert metrics.sentiment_from_emotions([]) == 0.0
