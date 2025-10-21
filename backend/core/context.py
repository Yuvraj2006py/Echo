"""Context utilities (request identifiers, per-request state)."""

from __future__ import annotations

import uuid
from contextvars import ContextVar, Token


_request_id_ctx_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def new_request_id() -> str:
    """Return a freshly generated request identifier."""
    return uuid.uuid4().hex


def set_request_id(value: str) -> Token:
    """Bind a request identifier to the current context."""
    return _request_id_ctx_var.set(value)


def reset_request_id(token: Token) -> None:
    """Reset the context-bound request identifier."""
    _request_id_ctx_var.reset(token)


def get_request_id() -> str | None:
    """Fetch the current request identifier if available."""
    return _request_id_ctx_var.get()
