"""Script to batch create specific physical users and cards.

Run:
    docker compose run --rm api python -m app.seed.seed_physical_users
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.db.models import Card, NanosInventory, NanosType, User
from app.db.session import AsyncSessionLocal
from app.security import hash_password

log = logging.getLogger("glitch.seed_users")

# Data from physical card image
USERS = [
    {"username": "user01", "password": "12345678", "rfid": "0452A494C82A81"},
    {"username": "user02", "password": "12345678", "rfid": "0411A494C82A81"},
    {"username": "user03", "password": "12345678", "rfid": "04ECA494C82A81"},
    {"username": "user04", "password": "12345678", "rfid": "043BA494C82A81"},
    {"username": "user05", "password": "12345678", "rfid": "0429A494C82A81"},
    {"username": "user06", "password": "12345678", "rfid": "0444A494C82A81"},
]

async def seed_users() -> None:
    async with AsyncSessionLocal() as session:
        types = (await session.execute(select(NanosType))).scalars().all()
        
        for u in USERS:
            # 1. Create or get user
            user = (
                await session.execute(select(User).where(User.username == u["username"]))
            ).scalar_one_or_none()
            
            if user is None:
                user = User(
                    username=u["username"],
                    email=f"{u['username']}@glitch.local",
                    password_hash=hash_password(u["password"]),
                    protein=100.0,  # Give some starter resources
                    carbs=100.0,
                    lipids=100.0,
                )
                session.add(user)
                await session.flush()
                log.info("Created user '%s' (id=%s)", user.username, user.id)
            else:
                log.info("User '%s' already exists", user.username)

            # 2. Bind card
            card = (
                await session.execute(select(Card).where(Card.rfid == u["rfid"]))
            ).scalar_one_or_none()
            
            if card is None:
                session.add(Card(rfid=u["rfid"], user_id=user.id, claim_code="000000"))
                log.info("Bound card rfid=%s -> user %s", u["rfid"], user.username)
            elif card.user_id is None:
                card.user_id = user.id
                log.info("Updated card rfid=%s -> user %s", u["rfid"], user.username)
            else:
                log.info("Card rfid=%s is already bound to user %s", u["rfid"], card.user_id)

            # 3. Add starter nanos if missing
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

        await session.commit()
        log.info("Successfully completed seeding physical users and cards.")

def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s :: %(message)s")
    asyncio.run(seed_users())

if __name__ == "__main__":
    main()
