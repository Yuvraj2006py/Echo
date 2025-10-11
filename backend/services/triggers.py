"""Trigger detection and statistics helpers."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "at",
    "by",
    "it",
    "is",
    "was",
    "were",
    "am",
    "are",
    "be",
    "this",
    "that",
    "but",
    "so",
    "or",
    "if",
    "from",
    "as",
    "we",
    "i",
    "me",
    "my",
    "you",
    "your",
}


TOKEN_PATTERN = re.compile(r"[A-Za-z']+")


def tokenize(text: str) -> List[str]:
    tokens = [match.group(0).lower() for match in TOKEN_PATTERN.finditer(text)]
    return [token for token in tokens if token not in STOPWORDS and len(token) > 2]


def suggest_triggers(entries: Sequence[Dict[str, Any]], *, limit: int = 5) -> List[Tuple[str, int]]:
    """Return candidate trigger words sorted by frequency."""
    counter: Counter[str] = Counter()
    for entry in entries:
        for token in set(tokenize(entry.get("text", ""))):
            counter[token] += 1
    return counter.most_common(limit)


def match_trigger_name(text: str, triggers: Sequence[Dict[str, Any]]) -> Optional[str]:
    tokens = set(tokenize(text))
    for trigger in triggers:
        words = trigger.get("words") or []
        if any(word.lower() in tokens for word in words):
            return trigger.get("name")
    return None


def _top_emotion(entry: Dict[str, Any]) -> Optional[str]:
    emotions = entry.get("emotion_json") or []
    if not emotions:
        return None
    sorted_emotions = sorted(emotions, key=lambda item: item.get("score", 0), reverse=True)
    return sorted_emotions[0].get("label")


def _entries_with_trigger(
    entries: Sequence[Dict[str, Any]],
    trigger_words: Iterable[str],
) -> List[Dict[str, any]]:
    normalized = {word.lower() for word in trigger_words}
    if not normalized:
        return []
    result = []
    for entry in entries:
        tokens = set(tokenize(entry.get("text", "")))
        if tokens & normalized:
            result.append(entry)
    return result


def compute_trigger_stats(
    entries: Sequence[Dict[str, Any]],
    triggers: Sequence[Dict[str, Any]],
) -> List[Dict[str, any]]:
    """Attach simple correlation stats for each trigger."""
    if not entries or not triggers:
        return []

    overall_counter: Counter[str] = Counter()
    for entry in entries:
        emotion = _top_emotion(entry)
        if emotion:
            overall_counter[emotion.lower()] += 1

    total_entries = sum(overall_counter.values()) or 1
    baseline = {emotion: count / total_entries for emotion, count in overall_counter.items()}

    results: List[Dict[str, any]] = []
    for trigger in triggers:
        words = trigger.get("words") or []
        matched_entries = _entries_with_trigger(entries, words)
        match_count = len(matched_entries)
        correlation: Dict[str, float] = {}

        if match_count > 0:
            trigger_counter: Counter[str] = Counter()
            for entry in matched_entries:
                emotion = _top_emotion(entry)
                if emotion:
                    trigger_counter[emotion.lower()] += 1

            for emotion, count in trigger_counter.items():
                baseline_rate = baseline.get(emotion, 0.0)
                trigger_rate = count / match_count
                delta = trigger_rate - baseline_rate
                correlation[emotion] = round(delta * 100, 1)

        results.append(
            {
                "id": trigger.get("id"),
                "name": trigger.get("name"),
                "words": words,
                "stats": {
                    "count": match_count,
                    "correlation": correlation,
                },
            }
        )

    return results
