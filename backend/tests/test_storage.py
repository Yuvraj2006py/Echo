from __future__ import annotations

import pytest
from fastapi import HTTPException

from backend.services.auth import AuthenticatedUser
from backend.services.storage import JournalAssetStorage


class _StubBucket:
    def __init__(self, *, fail_code: int | None = None) -> None:
        self.fail_code = fail_code
        self.upload_calls: list[tuple[str, bytes, dict]] = []
        self.download_calls: list[str] = []

    def upload(self, path: str, data: bytes, options: dict) -> dict:
        if self.fail_code:
            error = Exception("permission denied")
            setattr(error, "status_code", self.fail_code)
            raise error
        self.upload_calls.append((path, data, options))
        return {"Key": path}

    def download(self, path: str) -> bytes:
        if self.fail_code:
            error = Exception("permission denied")
            setattr(error, "status_code", self.fail_code)
            raise error
        self.download_calls.append(path)
        return b"asset-bytes"


class _StubClient:
    def __init__(self, bucket: _StubBucket) -> None:
        self._bucket = bucket

    @property
    def storage(self) -> "_StubClient":
        return self

    def from_(self, _: str) -> _StubBucket:
        return self._bucket


def _user(user_id: str = "user-123") -> AuthenticatedUser:
    return AuthenticatedUser(id=user_id, email="user@example.com", raw={"role": "user"})


def test_upload_scopes_to_owner() -> None:
    bucket = _StubBucket()
    storage = JournalAssetStorage(client=_StubClient(bucket))

    result = storage.upload(_user(), "images/avatar.png", b"bytes", "image/png")

    assert bucket.upload_calls == [
        ("user-123/images/avatar.png", b"bytes", {"contentType": "image/png", "upsert": False})
    ]
    assert result["path"] == "user-123/images/avatar.png"
    assert result["raw"] == {"Key": "user-123/images/avatar.png"}


def test_download_scopes_to_owner() -> None:
    bucket = _StubBucket()
    storage = JournalAssetStorage(client=_StubClient(bucket))

    content = storage.download(_user(), "/docs/report.pdf")

    assert content == b"asset-bytes"
    assert bucket.download_calls == ["user-123/docs/report.pdf"]


def test_upload_raises_forbidden_for_other_user() -> None:
    bucket = _StubBucket(fail_code=403)
    storage = JournalAssetStorage(client=_StubClient(bucket))

    with pytest.raises(HTTPException) as exc:
        storage.upload(_user(), "notes.md", b"deny-me")
    assert exc.value.status_code == 403


def test_download_raises_forbidden_for_other_user() -> None:
    bucket = _StubBucket(fail_code=403)
    storage = JournalAssetStorage(client=_StubClient(bucket))

    with pytest.raises(HTTPException) as exc:
        storage.download(_user(), "notes.md")
    assert exc.value.status_code == 403
