from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient

from backend.core import get_settings
from backend.routes import profile as profile_routes
from backend.services.auth import AuthenticatedUser, get_current_user


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    from backend.main import app

    settings = get_settings()

    # Provide stubbed implementations to avoid external calls.
    monkeypatch.setattr(profile_routes.queries, "get_profile", lambda _: {"full_name": "Echo User"})
    monkeypatch.setattr(
        profile_routes.queries,
        "upsert_profile",
        lambda user_id, full_name: {"full_name": full_name, "user_id": user_id},
    )

    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="user-test",
        email="user@example.com",
        raw={"role": "user"},
    )
    app.state.limiter.reset()

    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client

    app.dependency_overrides.clear()
    app.state.limiter.reset()


def test_security_headers_applied(client: TestClient) -> None:
    settings = get_settings()
    response = client.get("/", headers={"x-forwarded-for": "203.0.113.1"})

    assert response.status_code == 200
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("referrer-policy") == settings.referrer_policy
    assert "max-age" in (response.headers.get("strict-transport-security") or "")
    assert response.headers.get("content-security-policy") == settings.content_security_policy


def test_profile_write_rate_limited(client: TestClient) -> None:
    settings = get_settings()
    csrf_token = "csrf-test-token"
    client.cookies.set(settings.csrf_cookie_name, csrf_token)
    headers = {
        "x-forwarded-for": "198.51.100.10",
        settings.csrf_header_name: csrf_token,
    }
    payload = {"full_name": "Echo Tester"}

    first = client.post("/profile", json=payload, headers=headers)
    second = client.post("/profile", json=payload, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200

    third = client.post("/profile", json=payload, headers=headers)
    assert third.status_code == 429
    body = third.json()
    assert body["detail"] == "Too many requests. Please slow down."
    assert "request_id" in body


def test_csrf_missing_header_rejected(client: TestClient) -> None:
    response = client.post("/profile", json={"full_name": "Echo"})
    assert response.status_code == 403
    assert response.json()["detail"] == "CSRF token missing."


def test_csrf_mismatched_token_rejected(client: TestClient) -> None:
    settings = get_settings()
    client.cookies.set(settings.csrf_cookie_name, "cookie-token")
    response = client.post(
        "/profile",
        json={"full_name": "Mismatch"},
        headers={settings.csrf_header_name: "different-token"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "CSRF token mismatch."


def test_csrf_valid_token_allows_request(client: TestClient) -> None:
    settings = get_settings()
    token = "valid-csrf-token"
    client.cookies.set(settings.csrf_cookie_name, token)
    response = client.post(
        "/profile",
        json={"full_name": "Echo CSRF"},
        headers={settings.csrf_header_name: token},
    )
    assert response.status_code == 200


def test_healthz_endpoint(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_readyz_with_supabase_available(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
) -> None:
    class _Query:
        def select(self, _: str) -> "_Query":
            return self

        def limit(self, _: int) -> "_Query":
            return self

        def execute(self) -> None:
            return None

    class _Client:
        def table(self, _: str) -> _Query:
            return _Query()

    monkeypatch.setattr("backend.main.get_client", lambda: _Client())
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
