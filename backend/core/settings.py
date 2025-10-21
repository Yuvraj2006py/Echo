"""Runtime configuration utilities for the Echo backend."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import BaseModel, Field, HttpUrl, ValidationError


def _split_csv(value: str) -> List[str]:
    entries = [item.strip() for item in value.split(",") if item.strip()]
    return entries


class Settings(BaseModel):
    """Strongly typed runtime settings."""

    environment: str = Field(default="development")
    allowed_origins: List[str]
    trusted_hosts: List[str]
    supabase_url: HttpUrl
    supabase_service_role_key: str
    supabase_jwt_secret: str
    supabase_jwt_audience: str | None = None
    log_level: str = Field(default="INFO")
    cors_allow_methods: List[str] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    cors_allow_headers: List[str] = Field(
        default_factory=lambda: [
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "Accept",
        ]
    )
    rate_limit_default: str = Field(default="120/minute")
    rate_limit_write: str = Field(default="30/minute")
    rate_limit_auth: str = Field(default="10/minute")
    request_body_limit: int = Field(default=1024 * 1024, ge=10_000, le=8 * 1024 * 1024)
    enable_https_redirect: bool = Field(default=True)
    content_security_policy: str = Field(
        default=(
            "default-src 'self'; "
            "connect-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "style-src 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'"
        )
    )
    referrer_policy: str = Field(default="strict-origin-when-cross-origin")
    permissions_policy: str = Field(
        default="accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), usb=()"
    )
    preload_models: bool = Field(default=True)
    sentry_dsn: str | None = None
    csrf_cookie_name: str = Field(default="csrf_token")
    csrf_header_name: str = Field(default="X-CSRF-Token")

    @classmethod
    def from_env(cls) -> "Settings":
        environment = os.getenv("ENVIRONMENT", "development").strip().lower()

        raw_allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
        if raw_allowed_origins:
            allowed_origins = _split_csv(raw_allowed_origins)
        elif environment in {"development", "test"}:
            allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://testserver",
            ]
        else:
            raise ValueError("ALLOWED_ORIGINS must be set for non-development environments.")

        raw_trusted_hosts = os.getenv("TRUSTED_HOSTS", "")
        if raw_trusted_hosts:
            trusted_hosts = _split_csv(raw_trusted_hosts)
        elif environment in {"development", "test"}:
            trusted_hosts = ["localhost", "127.0.0.1", "testserver"]
        else:
            raise ValueError("TRUSTED_HOSTS must be set for non-development environments.")

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        supabase_jwt_audience = os.getenv("SUPABASE_JWT_AUDIENCE") or None

        if not supabase_url:
            raise ValueError("SUPABASE_URL is required.")
        if not supabase_service_role_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required.")
        if not supabase_jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET is required.")

        request_body_limit = int(
            os.getenv("REQUEST_BODY_LIMIT_BYTES", str(1024 * 1024)).strip()
        )

        rate_limit_default = os.getenv("RATE_LIMIT_DEFAULT", "120/minute").strip()
        rate_limit_write = os.getenv("RATE_LIMIT_WRITE", "30/minute").strip()
        rate_limit_auth = os.getenv("RATE_LIMIT_AUTH", "10/minute").strip()

        log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper()
        content_security_policy = os.getenv("CONTENT_SECURITY_POLICY")
        referrer_policy = os.getenv("REFERRER_POLICY")
        permissions_policy = os.getenv("PERMISSIONS_POLICY")

        enable_https_redirect = os.getenv("ENABLE_HTTPS_REDIRECT")
        if enable_https_redirect is None:
            enable_https_redirect_flag = environment == "production"
        else:
            enable_https_redirect_flag = enable_https_redirect.strip().lower() in {"1", "true", "yes"}

        preload_models = os.getenv("PRELOAD_MODELS")
        if preload_models is None:
            preload_models_flag = environment not in {"test"}
        else:
            preload_models_flag = preload_models.strip().lower() in {"1", "true", "yes"}

        sentry_dsn = os.getenv("SENTRY_DSN") or None

        cors_allow_methods = _split_csv(os.getenv("CORS_ALLOW_METHODS", "")) or None
        cors_allow_headers = _split_csv(os.getenv("CORS_ALLOW_HEADERS", "")) or None

        data = {
            "environment": environment,
            "allowed_origins": allowed_origins,
            "trusted_hosts": trusted_hosts,
            "supabase_url": supabase_url,
            "supabase_service_role_key": supabase_service_role_key,
            "supabase_jwt_secret": supabase_jwt_secret,
            "supabase_jwt_audience": supabase_jwt_audience,
            "log_level": log_level,
            "rate_limit_default": rate_limit_default,
            "rate_limit_write": rate_limit_write,
            "rate_limit_auth": rate_limit_auth,
            "request_body_limit": request_body_limit,
            "enable_https_redirect": enable_https_redirect_flag,
            "preload_models": preload_models_flag,
            "sentry_dsn": sentry_dsn,
        }
        if cors_allow_methods:
            data["cors_allow_methods"] = cors_allow_methods
        if cors_allow_headers:
            data["cors_allow_headers"] = cors_allow_headers
        if content_security_policy:
            data["content_security_policy"] = content_security_policy
        if referrer_policy:
            data["referrer_policy"] = referrer_policy
        if permissions_policy:
            data["permissions_policy"] = permissions_policy
        data["csrf_cookie_name"] = os.getenv("CSRF_COOKIE_NAME", "csrf_token").strip() or "csrf_token"
        data["csrf_header_name"] = os.getenv("CSRF_HEADER_NAME", "X-CSRF-Token").strip() or "X-CSRF-Token"

        try:
            return cls.model_validate(data)
        except ValidationError as exc:
            raise ValueError(f"Invalid backend configuration: {exc}") from exc


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings.from_env()
