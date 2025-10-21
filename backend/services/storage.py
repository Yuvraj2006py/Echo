"""Helpers for interacting with Supabase storage buckets."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException

from ..db.supabase import get_client
from .auth import AuthenticatedUser


class JournalAssetStorage:
    """Supabase storage helper for the private journal-assets bucket."""

    bucket_id = "journal-assets"

    def __init__(self, client: Optional[Any] = None) -> None:
        self._client = client or get_client()

    def _bucket(self) -> Any:
        return self._client.storage.from_(self.bucket_id)

    @staticmethod
    def _object_path(user_id: str, object_name: str) -> str:
        cleaned = object_name.strip().lstrip("/")
        if not cleaned:
            raise ValueError("Object name cannot be empty.")
        return f"{user_id}/{cleaned}"

    @staticmethod
    def _translate_storage_error(exc: Exception, action: str) -> HTTPException:
        status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        if status == 403:
            raise HTTPException(status_code=403, detail=f"{action} forbidden by storage policy.") from exc
        raise HTTPException(status_code=502, detail=f"Supabase storage {action} failed.") from exc

    def upload(
        self,
        user: AuthenticatedUser,
        object_name: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> dict[str, Any]:
        """Upload a new object scoped to the authenticated owner."""
        full_path = self._object_path(user.id, object_name)
        try:
            response = self._bucket().upload(
                full_path,
                data,
                {"contentType": content_type, "upsert": False},
            )
        except Exception as exc:  # pragma: no cover - handled in tests via specific exceptions
            raise self._translate_storage_error(exc, "upload") from exc
        return {"path": full_path, "raw": response}

    def download(self, user: AuthenticatedUser, object_name: str) -> bytes:
        """Download an object ensuring the caller is the owner."""
        full_path = self._object_path(user.id, object_name)
        try:
            return self._bucket().download(full_path)
        except Exception as exc:  # pragma: no cover - handled in tests via specific exceptions
            raise self._translate_storage_error(exc, "download") from exc
