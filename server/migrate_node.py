import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.models import Node, Food

async def main():
    async with AsyncSessionLocal() as session:
        # Create Locker_01
        node_exists = (await session.execute(text("SELECT id FROM nodes WHERE id='Locker_01'"))).scalar()
        if not node_exists:
            await session.execute(text("INSERT INTO nodes (id, name, location, status, tailscale_ip) VALUES ('Locker_01', 'Locker 01 (Demo)', 'Front Desk', 'online', '100.81.111.39')"))
            
        # Move all foods from locker-01 to Locker_01
        await session.execute(text("UPDATE foods SET node_id='Locker_01' WHERE node_id='locker-01'"))
        
        # Delete old locker-01
        await session.execute(text("DELETE FROM nodes WHERE id='locker-01'"))
        
        await session.commit()
        print("Migrated node to Locker_01")

if __name__ == "__main__":
    asyncio.run(main())
