"""Profile endpoints for managing user display names."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..db import queries
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    full_name: str | None = None


class ProfilePayload(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)


@router.get("", response_model=ProfileResponse)
def read_profile(user: AuthenticatedUser = Depends(get_current_user)) -> ProfileResponse:
    record = queries.get_profile(user.id)
    return ProfileResponse(full_name=record["full_name"] if record else None)


@router.post("", response_model=ProfileResponse)
def write_profile(
    payload: ProfilePayload,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ProfileResponse:
    record = queries.upsert_profile(user.id, payload.full_name.strip())
    return ProfileResponse(full_name=record["full_name"])
