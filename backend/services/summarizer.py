"""Summary generator using lightweight heuristics."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Sequence


class WeeklySummarizer:
    POSITIVE = {
        "joy",
        "love",
        "surprise",
        "calm",
        "proud",
        "grateful",
        "gratitude",
        "content",
        "hopeful",
    }
    CHALLENGING = {
        "sadness",
        "anger",
        "fear",
        "anxiety",
        "frustrated",
        "tired",
        "overwhelmed",
        "stress",
        "disgust",
    }
    DEFAULT_NUDGE = (
        "Take a steady breath, jot one grounding intention, and remind yourself that showing up to reflect is care."
    )
    NUDGES = {
        "joy": "Savor the bright spots by sharing one with someone who will celebrate alongside you.",
        "love": "Let that warmth travel further with a quick note of gratitude to someone who helped.",
        "surprise": "Capture what this curveball taught you so it can guide a future decision.",
        "sadness": "Offer a quiet pause tonight and name one gentle step for tomorrow.",
        "anger": "Channel the spark into motion—write a draft response or take a reset walk first.",
        "fear": "List one thing you can influence and let it be your anchor.",
        "anxiety": "Pair an exhale with a reminder that you can move in half-steps and still make progress.",
        "disgust": "Protect your energy by drawing a boundary that keeps you grounded.",
        "calm": "Keep the steady cadence by scheduling a small ritual you enjoy.",
        "proud": "Celebrate the progress by sharing it with someone who roots for you.",
        "grateful": "Note the people or moments lighting you up and plan how to nourish them.",
        "frustrated": "List what is in your control vs. what is noise, and give energy to the first column.",
    }
    TIMEFRAME_LABEL = {"day": "today", "week": "this week", "month": "this month"}
    TIMEFRAME_ACTION = {"day": "today", "week": "this week", "month": "over the month"}

    def load(self) -> None:
        """Kept for compatibility; no heavy model loading required."""
        return None

    def summarize(self, entries: Sequence[Dict[str, Any]], timeframe: str = "week") -> str:
        if not entries:
            return "No reflections logged yet. Capture a note so Echo can spot your patterns."

        normalized = [self._normalize_entry(item) for item in entries if item]
        normalized = [item for item in normalized if item]
        if not normalized:
            return "Echo needs a few more reflections with emotion insights to surface guidance."

        timeframe = timeframe if timeframe in {"day", "week", "month"} else "week"

        emotion_counts: Counter[str] = Counter()
        bucket_counts: Counter[str] = Counter()
        days_active: set[str] = set()
        positive_tags: Counter[str] = Counter()
        challenging_tags: Counter[str] = Counter()
        positive_emotions: Counter[str] = Counter()
        challenging_emotions: Counter[str] = Counter()

        for entry in normalized:
            created_at = entry.get("created_at")
            self._track_day(created_at, days_active)

            label = entry.get("top_emotion_label")
            if not label:
                continue

            label = label.lower()
            emotion_counts[label] += 1
            bucket = self._bucket_for(label)
            bucket_counts[bucket] += 1

            tags = entry.get("tags") or []
            if bucket == "positive":
                positive_emotions[label] += 1
                positive_tags.update(tags)
            elif bucket == "challenging":
                challenging_emotions[label] += 1
                challenging_tags.update(tags)

        total_reflections = max(len(normalized), 1)
        total = sum(emotion_counts.values()) or total_reflections
        dominant_label, dominant_count = (emotion_counts.most_common(1) or [("neutral", 0)])[0]
        dominant_pct = round((dominant_count / total) * 100) if total else 0
        active_days = max(len(days_active), 1)

        positive_total = bucket_counts.get("positive", 0)
        challenging_total = bucket_counts.get("challenging", 0)
        neutral_total = max(total - positive_total - challenging_total, 0)

        top_emotions = [
            f"{emotion.title()} {round((count / total) * 100)}%"
            for emotion, count in emotion_counts.most_common(3)
        ]

        lines: List[str] = []
        lines.append(
            f"Overview • {self.TIMEFRAME_LABEL[timeframe].capitalize()}, you captured {total_reflections} reflection"
            f"{'' if total_reflections == 1 else 's'} across {active_days} day"
            f"{'' if active_days == 1 else 's'}. {dominant_label.title()} led {dominant_pct}% of the tone."
        )

        if positive_total or challenging_total:
            pos_pct = round((positive_total / total) * 100)
            chall_pct = round((challenging_total / total) * 100)
            neutral_pct = max(0, 100 - pos_pct - chall_pct)
            lines.append(
                "Energy mix • "
                f"{pos_pct}% restorative, {chall_pct}% taxing, {neutral_pct}% steady moments logged."
            )

        if top_emotions:
            lines.append(f"Focus • Top emotions: {', '.join(top_emotions)}.")

        celebrate_line = self._build_highlight("positive", positive_tags, positive_emotions, timeframe)
        if celebrate_line:
            lines.append(f"Celebrate • {celebrate_line}")

        support_line = self._build_highlight("challenging", challenging_tags, challenging_emotions, timeframe)
        if support_line:
            lines.append(f"Support • {support_line}")

        if challenging_total and positive_total:
            momentum_gap = challenging_total - positive_total
            if momentum_gap > 1:
                lines.append(
                    "Rebalance • Taxing themes edged ahead—schedule a buffer or recharge ritual before the next busy stretch."
                )
            elif positive_total > challenging_total:
                lines.append(
                    "Momentum • Restorative moments are winning—double down on routines that invite them."
                )
        elif challenging_total and not positive_total:
            lines.append(
                "Recovery • This period leaned heavy. Add one gentle checkpoint—stretch, journal, or step outside—before lights-out."
            )

        nudge = self.NUDGES.get(dominant_label, self.DEFAULT_NUDGE)
        lines.append(f"Next step • {self._adapt_nudge(nudge, timeframe)}")
        return "\n".join(lines)

    def _normalize_entry(self, item: Any) -> Dict[str, Any] | None:
        if isinstance(item, str):
            text = item.strip()
            if not text:
                return None
            return {
                "text": text,
                "top_emotion_label": None,
                "created_at": None,
                "tags": [],
            }
        if not isinstance(item, dict):
            return None

        text = str(item.get("text") or "").strip()
        if not text:
            return None

        emotions = item.get("emotion_json") or []
        top_label = None
        top_score = -1.0
        if isinstance(emotions, Iterable):
            for emotion in emotions:
                if not isinstance(emotion, dict):
                    continue
                label = str(emotion.get("label") or "").lower()
                try:
                    score = float(emotion.get("score", 0))
                except (TypeError, ValueError):
                    score = 0.0
                if label and score > top_score:
                    top_label = label
                    top_score = score

        tags_raw = item.get("tags") or []
        tags = [str(tag).lower() for tag in tags_raw if isinstance(tag, str)]

        return {
            "text": text,
            "top_emotion_label": top_label,
            "created_at": item.get("created_at"),
            "tags": tags,
        }

    def _bucket_for(self, label: str) -> str:
        label_lower = label.lower()
        if label_lower in self.POSITIVE:
            return "positive"
        if label_lower in self.CHALLENGING:
            return "challenging"
        return "neutral"

    def _track_day(self, created_at: Any, bucket: set[str]) -> None:
        if not created_at:
            return
        if isinstance(created_at, datetime):
            day = created_at.date().isoformat()
        elif isinstance(created_at, str):
            try:
                parsed = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                return
            day = parsed.date().isoformat()
        else:
            return
        bucket.add(day)

    def _build_highlight(
        self,
        bucket: str,
        tags: Counter[str],
        emotions: Counter[str],
        timeframe: str,
    ) -> str | None:
        if tags:
            top_tags = [f"#{tag}" for tag, _ in tags.most_common(2)]
            readable = ", ".join(top_tags)
            if bucket == "positive":
                return f"{readable} moments lifted you—protect space for them {self.TIMEFRAME_ACTION[timeframe]}."
            return f"{readable} situations drained energy—plan one boundary or recovery step before they repeat."
        if emotions:
            emotion, _ = emotions.most_common(1)[0]
            if bucket == "positive":
                return f"{emotion.title()} spikes were grounding—repeat whatever set them in motion."
            return f"{emotion.title()} showed up often—prep a micro-support when it surfaces."
        return None

    def _adapt_nudge(self, nudge: str, timeframe: str) -> str:
        if timeframe == "day":
            return nudge.replace("this week", "today").replace("tonight", "tonight").replace("over the month", "today")
        if timeframe == "month":
            return (
                nudge.replace("tonight", "this week")
                .replace("today", "this week")
                .replace("this week", "this month")
            )
        return nudge


@lru_cache(maxsize=1)
def get_weekly_summarizer() -> WeeklySummarizer:
    summarizer = WeeklySummarizer()
    summarizer.load()
    return summarizer
