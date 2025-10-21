"""Custom ASGI middleware for the Echo backend."""

from __future__ import annotations

import logging
import time
from typing import Callable, Optional
import secrets

from fastapi import Request, status
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .context import get_request_id, new_request_id, reset_request_id, set_request_id


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach request identifiers and emit structured access logs."""

    def __init__(self, app: ASGIApp, header_name: str = "X-Request-ID") -> None:
        super().__init__(app)
        self.header_name = header_name
        self.logger = logging.getLogger("backend.request")

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        request_id = request.headers.get(self.header_name) or new_request_id()
        token = set_request_id(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            self.logger.exception(
                "request.failed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "client": request.client.host if request.client else "-",
                },
            )
            raise
        else:
            duration_ms = (time.perf_counter() - start) * 1000
            self.logger.info(
                "request.completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client": request.client.host if request.client else "-",
                },
            )
        finally:
            reset_request_id(token)

        response.headers[self.header_name] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests that exceed the configured body size limit."""

    def __init__(self, app: ASGIApp, max_body_size: int) -> None:
        super().__init__(app)
        self.max_body_size = max_body_size

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_size:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": "Request body too large.",
                            "limit_bytes": self.max_body_size,
                        },
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."},
                )

        return await call_next(request)


class CSRFMiddleware(BaseHTTPMiddleware):
    """Validate double-submit CSRF tokens for state-changing requests."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        cookie_name: str = "csrf_token",
        header_name: str = "X-CSRF-Token",
    ) -> None:
        super().__init__(app)
        self.cookie_name = cookie_name
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        if request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"}:
            cookie_token = request.cookies.get(self.cookie_name)
            header_token = request.headers.get(self.header_name)
            if not cookie_token or not header_token:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "CSRF token missing.",
                        "request_id": get_request_id() or "-",
                    },
                )
            if not secrets.compare_digest(cookie_token, header_token):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "CSRF token mismatch.",
                        "request_id": get_request_id() or "-",
                    },
                )

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Apply secure HTTP response headers."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        content_security_policy: Optional[str] = None,
        referrer_policy: Optional[str] = None,
        permissions_policy: Optional[str] = None,
        frame_deny: bool = True,
        content_type_nosniff: bool = True,
        hsts_max_age: int = 63072000,
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = True,
    ) -> None:
        super().__init__(app)
        self.content_security_policy = content_security_policy
        self.referrer_policy = referrer_policy
        self.permissions_policy = permissions_policy
        self.frame_deny = frame_deny
        self.content_type_nosniff = content_type_nosniff
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        response = await call_next(request)

        if self.content_security_policy and not response.headers.get("content-security-policy"):
            response.headers["Content-Security-Policy"] = self.content_security_policy

        if self.referrer_policy and not response.headers.get("referrer-policy"):
            response.headers["Referrer-Policy"] = self.referrer_policy

        if self.permissions_policy and not response.headers.get("permissions-policy"):
            response.headers["Permissions-Policy"] = self.permissions_policy

        if self.frame_deny and not response.headers.get("x-frame-options"):
            response.headers["X-Frame-Options"] = "DENY"

        if self.content_type_nosniff and not response.headers.get("x-content-type-options"):
            response.headers["X-Content-Type-Options"] = "nosniff"

        if request.url.scheme == "https":
            directives = [f"max-age={self.hsts_max_age}"]
            if self.hsts_include_subdomains:
                directives.append("includeSubDomains")
            if self.hsts_preload:
                directives.append("preload")
            existing = response.headers.get("strict-transport-security")
            if not existing:
                response.headers["Strict-Transport-Security"] = "; ".join(directives)

        return response
