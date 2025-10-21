from __future__ import annotations

import os

import pytest

from backend.core.settings import get_settings


# Ensure deterministic environment for all tests.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("ALLOWED_ORIGINS", "http://testserver")
os.environ.setdefault("TRUSTED_HOSTS", "testserver,localhost")
os.environ.setdefault("RATE_LIMIT_DEFAULT", "100/minute")
os.environ.setdefault("RATE_LIMIT_WRITE", "2/minute")
os.environ.setdefault("RATE_LIMIT_AUTH", "5/minute")
os.environ.setdefault("PRELOAD_MODELS", "0")

# Clear cached settings so that test-specific defaults apply.
get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    """Force settings cache to be rebuilt per-test to incorporate overrides."""
    get_settings.cache_clear()  # type: ignore[attr-defined]
    yield
    get_settings.cache_clear()  # type: ignore[attr-defined]
