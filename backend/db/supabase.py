"""
Supabase client helpers shared across the backend.

We rely on the service role key for server-side operations.
The module exposes `get_client()` which returns a cached client instance.
"""

from functools import lru_cache
import os
from typing import Optional

from supabase import Client, create_client


class SupabaseConfigError(RuntimeError):
    """Raised when Supabase environment variables are missing."""


@lru_cache(maxsize=1)
def get_client() -> Client:
    """Return a cached Supabase client instance."""
    url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not service_role_key:
        raise SupabaseConfigError(
            "Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    return create_client(url, service_role_key)


def refresh_client() -> Optional[Client]:
    """
    Clear the cached Supabase client and create a new one.
    Useful when environment variables change at runtime.
    """
    get_client.cache_clear()  # type: ignore[attr-defined]
    try:
        return get_client()
    except SupabaseConfigError:
        return None
