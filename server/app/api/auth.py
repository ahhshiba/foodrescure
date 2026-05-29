"""Auth endpoints — register + login (JWT)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NanosInventory, NanosType, User
from app.db.session import get_session
from app.schemas.rest import LoginRequest, RegisterRequest, TokenResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


async def _grant_starter_nanos(session: AsyncSession, user_id: int) -> None:
    types = (await session.execute(select(NanosType))).scalars().all()
    for nt in types:
        session.add(NanosInventory(user_id=user_id, nanos_type=nt.type, level=1))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    clash = (
        await session.execute(
            select(User).where((User.username == body.username) | (User.email == body.email))
        )
    ).scalar_one_or_none()
    if clash is not None:
        raise HTTPException(status_code=409, detail="Username or email already registered")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    session.add(user)
    await session.flush()
    await _grant_starter_nanos(session, user.id)
    await session.commit()
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)) -> TokenResponse:
    user = (
        await session.execute(select(User).where(User.username == body.username))
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return TokenResponse(access_token=create_access_token(user.id))
