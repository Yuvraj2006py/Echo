"""Echo FastAPI application."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from .routes import (
    analyze,
    analytics,
    calendar,
    coping as coping_routes,
    digest,
    entries,
    insights,
    profile,
    summary,
    triggers as triggers_routes,
)
from .services.emotion_analysis import get_emotion_analyzer
from .services.summarizer import get_weekly_summarizer


PROMPT = (
    "Echo: cross-platform emotional journaling w/ one-liners, tags, heatmap, coping kit, "
    "triggers, weekly digest, calendar context. Free-tier stack. See /shared/PROMPT.md."
)

load_dotenv()

app = FastAPI(
    title="Echo API",
    version="0.1.0",
    description="Backend for Echo emotional journaling apps.",
)


@lru_cache(maxsize=1)
def _allowed_origins() -> list[str]:
    origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    return [origin.strip() for origin in origins if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins() or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries.router)
app.include_router(analyze.router)
app.include_router(insights.router)
app.include_router(summary.router)
app.include_router(coping_routes.router)
app.include_router(triggers_routes.router)
app.include_router(calendar.router)
app.include_router(digest.router)
app.include_router(analytics.router)
app.include_router(profile.router)


@app.on_event("startup")
async def warm_models() -> None:
    """Load ML pipelines into memory to avoid cold starts."""
    get_emotion_analyzer()
    get_weekly_summarizer()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse({"message": "Echo API ready.", "prompt": PROMPT})
