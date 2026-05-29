"""Tests for the shared salvage engine + virtual salvage API."""

from __future__ import annotations

import uuid

import httpx
import pytest
from app.db.models import Food, Node, User
from app.db.session import AsyncSessionLocal
from app.engine import salvage
from app.main import app
from app.schemas.mqtt import StatusItem
from app.security import create_access_token, hash_password
from httpx import ASGITransport
from sqlalchemy import select


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _make_user() -> User:
    async with AsyncSessionLocal() as s:
        u = User(
            username=f"sv_{uuid.uuid4().hex[:8]}",
            email=f"{uuid.uuid4().hex[:8]}@glitchmail.io",
            password_hash=hash_password("password123"),
        )
        s.add(u)
        await s.commit()
        await s.refresh(u)
        return u


async def _make_node(online: bool = True, foods: int = 0) -> str:
    nid = f"svnode-{uuid.uuid4().hex[:8]}"
    async with AsyncSessionLocal() as s:
        s.add(Node(id=nid, name=nid, status="online" if online else "offline"))
        for _ in range(foods):
            s.add(Food(node_id=nid, food_class="porkchop_bento", health=80.0, claimed=False))
        await s.commit()
    return nid


async def test_process_salvage_credits_and_claims() -> None:
    user = await _make_user()
    nid = await _make_node(foods=1)
    items = [StatusItem.model_validate({"class": "porkchop_bento", "count": 1, "confidence": 1.0})]

    async with AsyncSessionLocal() as s:
        u = await s.get(User, user.id)
        assert u is not None
        result = await salvage.process_salvage(s, user=u, node_id=nid, items=items)

    assert result.claimed == 1
    # porkchop_bento seeds protein=30
    assert result.gains["protein"] == 30.0
    assert result.xp > 0

    async with AsyncSessionLocal() as s:
        u = await s.get(User, user.id)
        assert u is not None and u.protein >= 30.0
        food = (await s.execute(select(Food).where(Food.node_id == nid))).scalar_one()
        assert food.claimed is True


async def test_salvage_api_success_then_cooldown() -> None:
    nid = await _make_node(foods=3)
    async with _client() as c:
        u = uuid.uuid4().hex[:8]
        reg = await c.post(
            "/api/v1/auth/register",
            json={"username": f"u_{u}", "email": f"{u}@glitchmail.io", "password": "password123"},
        )
        token = reg.json()["access_token"]

        ok = await c.post(f"/api/v1/nodes/{nid}/salvage", json={"count": 1}, headers=_auth(token))
        assert ok.status_code == 200, ok.text
        assert ok.json()["claimed"] == 1

        again = await c.post(
            f"/api/v1/nodes/{nid}/salvage", json={"count": 1}, headers=_auth(token)
        )
        assert again.status_code == 429


async def test_salvage_empty_node_409() -> None:
    nid = await _make_node(foods=0)
    async with _client() as c:
        u = uuid.uuid4().hex[:8]
        reg = await c.post(
            "/api/v1/auth/register",
            json={"username": f"u_{u}", "email": f"{u}@glitchmail.io", "password": "password123"},
        )
        token = reg.json()["access_token"]
        r = await c.post(f"/api/v1/nodes/{nid}/salvage", json={"count": 1}, headers=_auth(token))
        assert r.status_code == 409


async def test_salvage_requires_auth() -> None:
    nid = await _make_node(foods=1)
    async with _client() as c:
        r = await c.post(f"/api/v1/nodes/{nid}/salvage", json={"count": 1})
        assert r.status_code == 401


async def test_salvage_offline_node_409() -> None:
    nid = await _make_node(online=False, foods=1)
    async with _client() as c:
        u = uuid.uuid4().hex[:8]
        reg = await c.post(
            "/api/v1/auth/register",
            json={"username": f"u_{u}", "email": f"{u}@glitchmail.io", "password": "password123"},
        )
        token = reg.json()["access_token"]
        r = await c.post(f"/api/v1/nodes/{nid}/salvage", json={"count": 1}, headers=_auth(token))
        assert r.status_code == 409


@pytest.mark.parametrize("token", ["bad.token.here"])
async def test_salvage_bad_token(token: str) -> None:
    nid = await _make_node(foods=1)
    async with _client() as c:
        r = await c.post(f"/api/v1/nodes/{nid}/salvage", json={"count": 1}, headers=_auth(token))
        assert r.status_code == 401


async def test_node_detail_returns_foods_with_zh_name() -> None:
    # Regression: /nodes/{id} must not trigger an async lazy-load of `foods`.
    nid = await _make_node(foods=1)
    async with _client() as c:
        r = await c.get(f"/api/v1/nodes/{nid}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body["foods"]) == 1
        assert body["foods"][0]["display_name_zh"] == "排骨便當"


def test_create_access_token_smoke() -> None:
    # sanity: token mint/verify round-trips (used by ws_listen/dev_seed)
    assert create_access_token(1)
