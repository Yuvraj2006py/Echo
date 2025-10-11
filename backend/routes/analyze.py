"""Ad-hoc emotion analysis."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from ..services import coping, emotion_analysis
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class AnalyzeResponse(BaseModel):
    emotions: list[dict]
    top: dict
    one_liner: str


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
def analyze_text(
    payload: AnalyzeRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyzeResponse:
    analyzer = emotion_analysis.get_emotion_analyzer()
    emotion_scores, top = analyzer.analyze(payload.text)

    one_liner = coping.generate_one_liner(
        top_emotion=top["label"],
        entry_text=payload.text,
        tags=[],
    )

    return AnalyzeResponse(emotions=emotion_scores, top=top, one_liner=one_liner)
