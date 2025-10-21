"""Coping kit routes."""

from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, validator

from ..core import rate_limit_write
from ..db import queries
from ..services.auth import AuthenticatedUser, get_current_user


router = APIRouter(prefix="/coping", tags=["coping"])


class CopingKitPayload(BaseModel):
    actions: List[str] = Field(default_factory=list, max_items=3)

    @validator("actions", each_item=True)
    def validate_action(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Action cannot be empty.")
        if len(normalized) > 80:
            raise ValueError("Action must be under 80 characters.")
        return normalized


CopingKitPayload.model_rebuild()


@router.get("/kit")
def get_kit(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    actions = queries.get_coping_kit(user.id) or []
    return {"actions": actions}


@router.post("/kit", status_code=status.HTTP_200_OK)
@rate_limit_write()
def save_kit(
    request: Request,
    payload: CopingKitPayload = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    if len(payload.actions) > 3:
        raise HTTPException(status_code=400, detail="Up to 3 coping actions are allowed.")
    actions = queries.save_coping_kit(user.id, payload.actions)
    return {"actions": actions}
