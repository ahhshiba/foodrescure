import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        await session.execute(text("UPDATE nodes SET lat=25.0185, lng=121.5410 WHERE id='Locker_01'"))
        await session.commit()
        print("Updated Locker_01 coordinates")

if __name__ == "__main__":
    asyncio.run(main())
