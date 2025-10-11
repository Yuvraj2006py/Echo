"""Emotion analysis service backed by a Hugging Face transformer pipeline."""

from __future__ import annotations

from functools import lru_cache
from typing import Dict, List, Tuple

from transformers import pipeline

EMOTION_MODEL_ID = "j-hartmann/emotion-english-distilroberta-base"


class EmotionAnalyzer:
    """Wraps the Hugging Face emotion model with a friendly API."""

    def __init__(self, model_id: str = EMOTION_MODEL_ID) -> None:
        self.model_id = model_id
        self._pipeline = None

    def load(self) -> None:
        if self._pipeline is None:
            self._pipeline = pipeline(
                "text-classification",
                model=self.model_id,
                return_all_scores=True,
            )

    def analyze(self, text: str) -> Tuple[List[Dict[str, float]], Dict[str, float]]:
        if not text.strip():
            scores = [{"label": "neutral", "score": 1.0}]
            return scores, scores[0]

        if self._pipeline is None:
            self.load()

        result = self._pipeline(text, truncation=True)
        scores: List[Dict[str, float]] = [
            {"label": item["label"], "score": float(item["score"])} for item in result[0]
        ]
        scores.sort(key=lambda item: item["score"], reverse=True)
        top = scores[0] if scores else {"label": "neutral", "score": 1.0}
        return scores, top


@lru_cache(maxsize=1)
def get_emotion_analyzer() -> EmotionAnalyzer:
    analyzer = EmotionAnalyzer()
    analyzer.load()
    return analyzer
