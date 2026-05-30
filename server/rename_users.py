import asyncio
from sqlalchemy import update
from app.db.session import AsyncSessionLocal
from app.db.models import User

async def main():
    async with AsyncSessionLocal() as session:
        for i in range(1, 7):
            old = f"user0{i}"
            new = f"User0{i}"
            await session.execute(
                update(User).where(User.username == old).values(username=new)
            )
        await session.commit()
        print("Updated usernames successfully!")

if __name__ == "__main__":
    asyncio.run(main())
