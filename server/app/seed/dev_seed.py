"""Minimal DEV seed for M2 end-to-end testing.

Creates one claimed card bound to a test player, a couple of nodes, and some
food instances so `sim_edge.py` can drive a full round. This is NOT the rich
30-day mock generator (that lands in M6) — keep them separate.

Run:
    docker compose run --rm api python -m app.seed.dev_seed
Prints a JWT for the test user so you can connect ws_listen.py.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.db.models import Card, Food, NanosInventory, NanosType, Node, User
from app.db.session import AsyncSessionLocal
from app.security import create_access_token, hash_password

log = logging.getLogger("glitch.devseed")

TEST_USERNAME = "neo"
TEST_RFID = "04DEADBEEF"

NODES = [
    {
        "id": "node-01",
        "name": "Cafeteria North",
        "location": "Bldg A 1F",
        "lat": 25.0173,
        "lng": 121.5398,
        "tailscale_ip": "host.docker.internal",
    },
    {
        "id": "node-02",
        "name": "Library Kiosk",
        "location": "Bldg B 2F",
        "lat": 25.0181,
        "lng": 121.5405,
        "tailscale_ip": "host.docker.internal",
    },
]

# (node_id, food_class, health)
FOODS = [
    ("node-01", "porkchop_bento", 95.0),
    ("node-01", "porkchop_bento", 80.0),
    ("node-01", "chicken_bento", 60.0),
    ("node-01", "veggie_bento", 40.0),
    ("node-02", "sushi_set", 88.0),
    ("node-02", "rice_ball", 70.0),
    ("node-02", "salad_box", 30.0),
    ("node-02", "sandwich", 55.0),
]


async def dev_seed() -> tuple[int, str]:
    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.username == TEST_USERNAME))
        ).scalar_one_or_none()
        if user is None:
            user = User(
                username=TEST_USERNAME,
                email="neo@glitch.test",
                password_hash=hash_password("password123"),
                protein=200.0,
                carbs=200.0,
                lipids=200.0,
            )
            session.add(user)
            await session.flush()
            log.info("Created test user '%s' (id=%s)", TEST_USERNAME, user.id)

        # Claimed card bound to the test user
        card = (
            await session.execute(select(Card).where(Card.rfid == TEST_RFID))
        ).scalar_one_or_none()
        if card is None:
            session.add(Card(rfid=TEST_RFID, user_id=user.id, claim_code="000000"))
            log.info("Bound card rfid=%s -> user %s", TEST_RFID, TEST_USERNAME)
        elif card.user_id is None:
            card.user_id = user.id

        # Starter nanos (level 1 of each type)
        types = (await session.execute(select(NanosType))).scalars().all()
        for nt in types:
            exists = (
                await session.execute(
                    select(NanosInventory).where(
                        NanosInventory.user_id == user.id, NanosInventory.nanos_type == nt.type
                    )
                )
            ).scalar_one_or_none()
            if exists is None:
                session.add(NanosInventory(user_id=user.id, nanos_type=nt.type, level=1))

        # Nodes
        for nd in NODES:
            existing = await session.get(Node, nd["id"])
            if existing is None:
                session.add(Node(status="online", **nd))
            else:
                existing.tailscale_ip = nd.get("tailscale_ip")
                existing.status = "online"

        # Foods (only seed if this node has none yet, to stay idempotent)
        existing_foods = (await session.execute(select(Food.node_id))).scalars().all()
        if not existing_foods:
            for node_id, food_class, health in FOODS:
                session.add(Food(node_id=node_id, food_class=food_class, health=health))
            log.info("Seeded %d food instances", len(FOODS))

        await session.commit()
        token = create_access_token(user.id)
        return user.id, token


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s :: %(message)s")
    user_id, token = asyncio.run(dev_seed())
    print(f"\nTest user id: {user_id}")
    print(f"RFID:         {TEST_RFID}")
    print(f"JWT token:    {token}\n")
    print("Connect the WS listener with:")
    print(f'  docker compose run --rm api python scripts/ws_listen.py --token "{token}"')


if __name__ == "__main__":
    main()
