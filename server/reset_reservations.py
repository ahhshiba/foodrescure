import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        await session.execute(text("UPDATE foods SET reserved=False, reserved_by=NULL, reserved_at=NULL WHERE claimed=False"))
        await session.commit()
        print("Reset reservations")

if __name__ == "__main__":
    asyncio.run(main())
