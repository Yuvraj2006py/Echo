"""Entry CRUD endpoints."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator

from ..core import rate_limit_write
from ..db import queries
from ..services import coping, emotion_analysis, metrics
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/entries", tags=["entries"])


SUGGESTION_PRESETS = {
    "joy": "Savor the bright spot by sharing it with someone who will celebrate alongside you.",
    "love": "Let that warmth travel further with a quick note of gratitude to someone you trust.",
    "surprise": "Jot down the insight this surprise offered so it does not slip away.",
    "sadness": "Offer yourself a quiet pause and name one gentle step for tomorrow.",
    "anger": "Release some of the charge with a walk or a page of thoughts before responding.",
    "fear": "Pick one small action you can influence today and let it be your anchor.",
    "anxiety": "Pair a slow inhale with the reminder that you can take things one beat at a time.",
    "disgust": "Protect your energy by sketching the boundary that would feel safest right now.",
    "neutral": "Notice one tiny detail you appreciate about this moment to tuck into memory.",
    "default": "Take a breath and acknowledge how showing up to reflect is caring for yourself.",
}


class EmotionScore(BaseModel):
    label: str
    score: float


class EntryCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    source: Optional[str] = Field(default="web", pattern="^(mobile|web)$")
    tags: Optional[List[str]] = Field(default_factory=list, max_items=10)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: Optional[List[str]]) -> List[str]:
        if value is None:
            return []
        sanitized: List[str] = []
        for raw in value:
            if not isinstance(raw, str):
                raise ValueError("Tags must be strings.")
            normalized = raw.strip()
            if not normalized:
                raise ValueError("Tags cannot be empty strings.")
            if len(normalized) > 32:
                raise ValueError("Tags must be at most 32 characters long.")
            sanitized.append(normalized)
        return sanitized


class EntryOut(BaseModel):
    id: str
    user_id: str
    text: str
    source: Optional[str] = "web"
    tags: List[str] = Field(default_factory=list)
    emotion_json: List[EmotionScore] = Field(default_factory=list)
    top_emotion: Optional[EmotionScore] = None
    created_at: datetime
    suggestion: Optional[str] = None
    entry_length: Optional[int] = None
    time_of_day: Optional[str] = None
    weekday: Optional[int] = None
    sentiment_score: Optional[float] = None
    response_delay_ms: Optional[int] = None


class EntryCreateResponse(BaseModel):
    entry: EntryOut
    one_liner: str


EntryCreate.model_rebuild()
EntryOut.model_rebuild()
EntryCreateResponse.model_rebuild()


def _derive_top_emotion(emotions: List[EmotionScore]) -> Optional[EmotionScore]:
    if not emotions:
        return None
    top = max(emotions, key=lambda item: item.score)
    return EmotionScore(label=top.label, score=top.score)


def _entry_from_db(data: dict) -> EntryOut:
    emotions = [
        EmotionScore(label=item["label"], score=float(item["score"]))
        for item in data.get("emotion_json") or []
    ]
    top = _derive_top_emotion(emotions)
    suggestion = data.get("ai_response")
    if not suggestion and top:
        suggestion = SUGGESTION_PRESETS.get(top.label.lower(), SUGGESTION_PRESETS["default"])
    return EntryOut(
        id=data["id"],
        user_id=data["user_id"],
        text=data["text"],
        source=data.get("source"),
        tags=data.get("tags") or [],
        emotion_json=emotions,
        top_emotion=top,
        created_at=data["created_at"],
        suggestion=suggestion,
        entry_length=data.get("entry_length"),
        time_of_day=data.get("time_of_day"),
        weekday=data.get("weekday"),
        sentiment_score=data.get("sentiment_score"),
        response_delay_ms=data.get("response_delay_ms"),
    )


@router.post("", response_model=EntryCreateResponse, status_code=status.HTTP_201_CREATED)
@rate_limit_write()
def create_entry(
    request: Request,
    payload: EntryCreate = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> EntryCreateResponse:
    now = metrics.ensure_utc(datetime.now(timezone.utc))
    entry_length = metrics.calculate_entry_length(payload.text)
    time_bucket = metrics.bucket_time_of_day(now)
    weekday_idx = metrics.weekday_index(now)

    analyzer = emotion_analysis.get_emotion_analyzer()
    emotion_scores, top = analyzer.analyze(payload.text)
    sentiment_score = metrics.sentiment_from_emotions(emotion_scores)

    one_liner = coping.generate_one_liner(
        top_emotion=top["label"],
        entry_text=payload.text,
        tags=payload.tags or [],
    )

    entry_record = queries.insert_entry(
        user_id=user.id,
        text=payload.text,
        source=payload.source or "web",
        tags=payload.tags or [],
        emotion_json=emotion_scores,
        ai_response=one_liner,
        entry_length=entry_length,
        time_of_day=time_bucket,
        weekday=weekday_idx,
        response_delay_ms=None,
        sentiment_score=sentiment_score,
        created_at=now,
    )

    entry_out = _entry_from_db(entry_record)
    entry_out.top_emotion = EmotionScore(label=top["label"], score=float(top["score"]))
    entry_out.suggestion = one_liner

    return EntryCreateResponse(entry=entry_out, one_liner=one_liner)


@router.get("", response_model=List[EntryOut])
def list_entries(
    user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> List[EntryOut]:
    records = queries.get_entries(user.id, limit=limit, offset=offset)
    return [_entry_from_db(record) for record in records]


@router.get("/{entry_id}", response_model=EntryOut)
def get_entry(
    entry_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> EntryOut:
    record = queries.get_entry(user.id, entry_id)
    if not record:
        raise HTTPException(status_code=404, detail="Entry not found.")
    return _entry_from_db(record)
