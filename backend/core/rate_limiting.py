"""Rate limiting helpers built on top of slowapi."""

from __future__ import annotations

from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .context import get_request_id
from .settings import get_settings


def _default_limits() -> list[str]:
    settings = get_settings()
    return [settings.rate_limit_default]


limiter = Limiter(key_func=get_remote_address, default_limits=_default_limits())


def rate_limit_write() -> Callable:
    """Decorator for write-heavy endpoints."""

    return limiter.limit(get_settings().rate_limit_write)


def rate_limit_auth() -> Callable:
    """Decorator for authentication-sensitive endpoints."""

    return limiter.limit(get_settings().rate_limit_auth)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Standard JSON payload when a client exceeds limits."""

    retry_after = getattr(exc, "retry_after", None)
    response = JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down.",
            "request_id": get_request_id() or "-",
            "retry_after": retry_after,
        },
    )
    if retry_after is not None:
        response.headers["Retry-After"] = str(retry_after)
    return response
