import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import User, Card, NanosType, NanosInventory
from app.security import hash_password

users_data = [
    ("User01", "0452A494C82A81"),
    ("User02", "0411A494C82A81"),
    ("User03", "04ECA494C82A81"),
    ("User04", "043BA494C82A81"),
    ("User05", "0429A494C82A81"),
    ("User06", "0444A494C82A81"),
]

password = "12345678"

async def _grant_starter_nanos(session, user_id: int) -> None:
    types = (await session.execute(select(NanosType))).scalars().all()
    # If no types are found, we just skip, but normally they should exist
    for nt in types:
        # Check if already has this nano
        existing = (await session.execute(
            select(NanosInventory).where(NanosInventory.user_id == user_id, NanosInventory.nanos_type == nt.type)
        )).scalar_one_or_none()
        if not existing:
            session.add(NanosInventory(user_id=user_id, nanos_type=nt.type, level=1))

async def main():
    async with AsyncSessionLocal() as session:
        for username, rfid in users_data:
            # Check if user already exists
            user = (await session.execute(
                select(User).where(User.username == username)
            )).scalar_one_or_none()
            
            if not user:
                print(f"Creating user {username}...")
                user = User(
                    username=username,
                    email=f"{username}@example.com",
                    password_hash=hash_password(password),
                )
                session.add(user)
                await session.flush()
                
                await _grant_starter_nanos(session, user.id)
            else:
                print(f"User {username} already exists, updating password...")
                user.password_hash = hash_password(password)
                await session.flush()
                await _grant_starter_nanos(session, user.id)
            
            # Check if card exists
            card = (await session.execute(
                select(Card).where(Card.rfid == rfid)
            )).scalar_one_or_none()
            
            if not card:
                print(f"Adding card {rfid} to {username}...")
                card = Card(
                    rfid=rfid,
                    user_id=user.id,
                    claim_code=rfid[-6:] # simple claim code
                )
                session.add(card)
            else:
                print(f"Card {rfid} already exists, updating owner to {username}...")
                card.user_id = user.id
                
        await session.commit()
        print("Done creating users and binding RFIDs!")

if __name__ == "__main__":
    asyncio.run(main())
