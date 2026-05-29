"""REST API integration tests (run against the compose Postgres).

The app lifespan (MQTT bridge / scheduler) is NOT triggered by ASGITransport,
so these exercise only the HTTP layer + DB. Unique uuid usernames keep reruns
isolated.
"""

from __future__ import annotations

import uuid

import httpx
import pytest
from app.db.models import Card, User
from app.db.session import AsyncSessionLocal
from app.main import app
from app.security import user_id_from_token
from httpx import ASGITransport


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _register(c: httpx.AsyncClient) -> tuple[str, str]:
    u = uuid.uuid4().hex[:10]
    r = await c.post(
        "/api/v1/auth/register",
        json={"username": f"u_{u}", "email": f"{u}@glitchmail.io", "password": "password123"},
    )
    assert r.status_code == 201, r.text
    return f"u_{u}", r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_register_login_me() -> None:
    async with _client() as c:
        username, token = await _register(c)

        login = await c.post(
            "/api/v1/auth/login", json={"username": username, "password": "password123"}
        )
        assert login.status_code == 200

        bad = await c.post("/api/v1/auth/login", json={"username": username, "password": "wrong"})
        assert bad.status_code == 401

        me = await c.get("/api/v1/me", headers=_auth(token))
        assert me.status_code == 200
        body = me.json()
        assert body["username"] == username
        assert body["level"] == 1
        assert body["protein"] == 0.0

        assert (await c.get("/api/v1/me")).status_code == 401  # no token


async def test_inventory_has_starter_nanos() -> None:
    async with _client() as c:
        _, token = await _register(c)
        inv = await c.get("/api/v1/inventory", headers=_auth(token))
        assert inv.status_code == 200
        types = {n["nanos_type"] for n in inv.json()["nanos"]}
        assert {"welder_spider", "suction_jelly", "crawler"} <= types


async def test_upgrade_insufficient_then_success() -> None:
    async with _client() as c:
        _, token = await _register(c)

        # Fresh user has 0 materials -> insufficient.
        r = await c.post("/api/v1/nanos/crawler/upgrade", headers=_auth(token))
        assert r.status_code == 409

        assert (await c.post("/api/v1/nanos/nope/upgrade", headers=_auth(token))).status_code == 404

        # Grant materials directly, then upgrade succeeds.
        uid = user_id_from_token(token)
        async with AsyncSessionLocal() as s:
            user = await s.get(User, uid)
            assert user is not None
            user.carbs = 1000.0
            await s.commit()

        ok = await c.post("/api/v1/nanos/crawler/upgrade", headers=_auth(token))
        assert ok.status_code == 200, ok.text
        assert ok.json()["new_level"] == 2
        assert "carbs" in ok.json()["spent"]


async def test_claim_pending_card() -> None:
    rfid = f"TESTCARD-{uuid.uuid4().hex[:8]}"
    async with AsyncSessionLocal() as s:
        s.add(Card(rfid=rfid, claim_code="123456"))
        await s.commit()

    async with _client() as c:
        _, token = await _register(c)
        bad = await c.post(
            "/api/v1/cards/claim", json={"rfid": rfid, "claim_code": "000000"}, headers=_auth(token)
        )
        assert bad.status_code == 404

        ok = await c.post(
            "/api/v1/cards/claim", json={"rfid": rfid, "claim_code": "123456"}, headers=_auth(token)
        )
        assert ok.status_code == 200


async def test_feedback_requires_own_transaction() -> None:
    async with _client() as c:
        _, token = await _register(c)
        r = await c.post(
            "/api/v1/feedback",
            json={"transaction_id": 999_999_999, "purity_stars": 5},
            headers=_auth(token),
        )
        assert r.status_code == 404


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/nodes",
        "/api/v1/stats/esg",
        "/api/v1/stats/entropy",
        "/api/v1/stats/fleet-accuracy",
        "/api/v1/leaderboard",
        "/api/v1/transactions",
    ],
)
async def test_public_stats_endpoints_ok(path: str) -> None:
    async with _client() as c:
        r = await c.get(path)
        assert r.status_code == 200


async def test_bounties_requires_auth() -> None:
    async with _client() as c:
        assert (await c.get("/api/v1/bounties")).status_code == 401
        _, token = await _register(c)
        r = await c.get("/api/v1/bounties", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
