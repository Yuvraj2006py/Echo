"""Trigger library routes."""

from datetime import UTC, datetime, timedelta
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, validator

from ..core import rate_limit_write
from ..db import queries
from ..services import triggers as trigger_service
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/triggers", tags=["triggers"])


class TriggerPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    words: List[str] = Field(..., min_items=1, max_items=10)

    @validator("words", each_item=True)
    def normalize_word(cls, value: str) -> str:
        word = value.strip().lower()
        if not word:
            raise ValueError("Trigger word cannot be empty.")
        if len(word) > 30:
            raise ValueError("Trigger word must be under 30 characters.")
        return word


TriggerPayload.model_rebuild()


@router.get("")
def list_triggers(user: AuthenticatedUser = Depends(get_current_user)) -> list[dict]:
    entries = queries.fetch_entries_since(
        user.id,
        datetime.now(UTC) - timedelta(days=180),
    )
    stored_triggers = queries.list_triggers(user.id)
    return trigger_service.compute_trigger_stats(entries, stored_triggers)


@router.post("", status_code=status.HTTP_200_OK)
@rate_limit_write()
def upsert_trigger(
    request: Request,
    payload: TriggerPayload = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    record = queries.upsert_trigger(
        user_id=user.id,
        name=payload.name.strip(),
        words=payload.words,
    )
    return record
