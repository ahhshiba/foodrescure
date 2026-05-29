import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.models import User, Card, Node

async def main():
    async with AsyncSessionLocal() as session:
        # 1. Clear all reservations to fix stuck state
        await session.execute(text("UPDATE foods SET reserved = false, reserved_by = null, reserved_at = null"))
        
        # 2. Bind UID F002F75F to user NEO
        user_id = (await session.execute(text("SELECT id FROM users WHERE username='NEO'"))).scalar()
        if user_id:
            card_id = (await session.execute(text("SELECT id FROM cards WHERE rfid='F002F75F'"))).scalar()
            if card_id:
                await session.execute(text(f"UPDATE cards SET user_id={user_id} WHERE rfid='F002F75F'"))
            else:
                await session.execute(text(f"INSERT INTO cards (rfid, user_id, claim_code) VALUES ('F002F75F', {user_id}, '123456')"))
        
        # 3. Rename a node to locker-01 (and set tailscale_ip)
        node_exists = (await session.execute(text("SELECT id FROM nodes WHERE id='locker-01'"))).scalar()
        if not node_exists:
            await session.execute(text("INSERT INTO nodes (id, name, location, status, tailscale_ip) VALUES ('locker-01', 'Locker 01 (Pi)', 'Test Area', 'online', '100.81.111.39')"))
            
        # Move foods from node-06 to locker-01 so it's populated
        await session.execute(text("UPDATE foods SET node_id='locker-01' WHERE node_id='node-06'"))
        # Also ensure tailscale IP is set if it already existed
        await session.execute(text("UPDATE nodes SET tailscale_ip='100.81.111.39' WHERE id='locker-01'"))
            
        await session.commit()
        print("Database fixes applied successfully!")

if __name__ == "__main__":
    asyncio.run(main())
