import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, name FROM nodes"))
        print(res.fetchall())

if __name__ == "__main__":
    asyncio.run(main())
