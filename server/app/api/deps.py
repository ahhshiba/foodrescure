"""Shared API dependencies — auth guard + pagination."""

from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_session
from app.security import user_id_from_token

_bearer = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if creds is None:
        raise _UNAUTHORIZED
    try:
        user_id = user_id_from_token(creds.credentials)
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise _UNAUTHORIZED from exc
    user = await session.get(User, user_id)
    if user is None:
        raise _UNAUTHORIZED
    return user


class Pagination:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
    ) -> None:
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size
        self.limit = page_size
