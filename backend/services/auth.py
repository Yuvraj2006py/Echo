"""Supabase authentication helpers."""

from __future__ import annotations

from typing import Any, Dict, Optional

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from ..core import get_settings


bearer_scheme = HTTPBearer(auto_error=False)
SESSION_COOKIE_NAME = "echo_session"


class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = None
    raw: Dict[str, Any]


def _decode_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    audience = settings.supabase_jwt_audience

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=audience if audience else None,
            options={
                "require": ["exp", "iat", "sub"],
                "verify_aud": bool(audience),
            },
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token expired.",
        ) from exc
    except jwt.InvalidAudienceError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token audience mismatch.",
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token.",
        ) from exc

    issuer = payload.get("iss")
    if issuer and settings.supabase_url not in issuer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token issuer mismatch.",
        )

    return payload


def _resolve_bearer_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    session_token: Optional[str],
) -> Optional[str]:
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    if session_token:
        return session_token
    return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session_token: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> AuthenticatedUser:
    token = _resolve_bearer_token(credentials, session_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials missing.",
        )

    payload = _decode_token(token)
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token missing subject.",
        )

    return AuthenticatedUser(
        id=user_id,
        email=payload.get("email"),
        raw=payload,
    )
