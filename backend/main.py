"""Echo FastAPI application."""

from __future__ import annotations

import logging
from typing import Any, Dict, Union

try:  # pragma: no cover - optional dependency
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
except ImportError:  # pragma: no cover - optional dependency
    sentry_sdk = None  # type: ignore
    FastApiIntegration = None  # type: ignore

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

from .core import get_settings, limiter
from .core.context import get_request_id
from .core.logging import configure_logging
from .core.middleware import (
    CSRFMiddleware,
    BodySizeLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from .core.rate_limiting import rate_limit_handler
from .db.supabase import SupabaseConfigError, get_client
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

settings = get_settings()
configure_logging(settings)
logger = logging.getLogger("backend.main")

if settings.sentry_dsn:
    if sentry_sdk is None or FastApiIntegration is None:
        logger.warning(
            "SENTRY_DSN provided but sentry-sdk is not installed; skipping Sentry integration."
        )
    else:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=1.0,
            send_default_pii=False,
            environment=settings.environment,
        )

app = FastAPI(
    title="Echo API",
    version="0.2.0",
    description="Backend for Echo emotional journaling apps.",
)
app.state.settings = settings
app.state.limiter = limiter

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CSRFMiddleware,
    cookie_name=settings.csrf_cookie_name,
    header_name=settings.csrf_header_name,
)
app.add_middleware(BodySizeLimitMiddleware, max_body_size=settings.request_body_limit)
app.add_middleware(GZipMiddleware, minimum_size=512)
app.add_middleware(
    SecurityHeadersMiddleware,
    content_security_policy=settings.content_security_policy,
    referrer_policy=settings.referrer_policy,
    permissions_policy=settings.permissions_policy,
    frame_deny=True,
    content_type_nosniff=True,
    hsts_include_subdomains=True,
    hsts_preload=True,
)

if settings.enable_https_redirect:
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.trusted_hosts,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
    max_age=3600,
)
app.add_middleware(SlowAPIMiddleware)

app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


def _error_payload(detail: Union[str, Dict[str, Any], list[Any]]) -> Dict[str, Any]:
    return {
        "detail": detail,
        "request_id": get_request_id() or "-",
    }


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_payload(exc.errors()),
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    payload = _error_payload(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=payload,
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled.exception",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_payload("Internal server error."),
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
    if settings.preload_models:
        get_emotion_analyzer()
        get_weekly_summarizer()
    logger.info("startup.complete", extra={"environment": settings.environment})


def _check_supabase() -> tuple[bool, str | None]:
    try:
        client = get_client()
        client.table("entries").select("id").limit(1).execute()
    except SupabaseConfigError as exc:
        logger.error("health.supabase_config_error", exc_info=exc)
        return False, "Supabase configuration missing."
    except Exception as exc:  # pragma: no cover - network exceptions during runtime
        logger.error("health.supabase_unavailable", exc_info=exc)
        return False, "Supabase API unavailable."
    return True, None


@app.get("/healthz", tags=["platform"])
def healthz() -> Dict[str, Any]:
    """Lightweight liveness probe."""
    return {
        "status": "ok",
        "version": app.version,
    }


@app.get("/readyz", tags=["platform"])
def readiness() -> JSONResponse:
    """Deep readiness probe that checks downstream dependencies."""
    supabase_ok, error = _check_supabase()
    status_code = status.HTTP_200_OK if supabase_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    payload: Dict[str, Any] = {"status": "ok" if supabase_ok else "degraded"}
    if error:
        payload["supabase_error"] = error
    return JSONResponse(status_code=status_code, content=payload)


@app.get("/health", include_in_schema=False)
def legacy_health() -> Dict[str, Any]:
    """Backward-compatible liveness endpoint."""
    return healthz()


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse({"message": "Echo API ready.", "prompt": PROMPT})
