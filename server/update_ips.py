import asyncio
from sqlalchemy import update
from app.db.session import AsyncSessionLocal
from app.db.models import Node

async def main():
    async with AsyncSessionLocal() as session:
        await session.execute(update(Node).values(tailscale_ip='100.81.111.39'))
        await session.commit()
    print('Updated tailscale IPs')

if __name__ == "__main__":
    asyncio.run(main())
