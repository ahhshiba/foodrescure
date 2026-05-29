import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.models import Node, FoodClass

async def main():
    async with AsyncSessionLocal() as session:
        # Check if locker-01 exists, if not, create it
        node_exists = (await session.execute(text("SELECT id FROM nodes WHERE id='locker-01'"))).scalar()
        if not node_exists:
            await session.execute(text("INSERT INTO nodes (id, name, location, status, tailscale_ip) VALUES ('locker-01', 'Locker 01 (Demo)', 'Front Desk', 'online', '100.81.111.39')"))
        
        # Add some demo food
        classes = ["fried_rice", "salad_box", "porkchop_bento", "sandwich"]
        for fc in classes:
            # Ensure class exists
            fc_exists = (await session.execute(text(f"SELECT class_name FROM food_classes WHERE class_name='{fc}'"))).scalar()
            if not fc_exists:
                await session.execute(text(f"INSERT INTO food_classes (class_name, display_name, display_name_zh, protein, carbs, lipids, base_decay_rate, co2_saved_g, money_saved) VALUES ('{fc}', '{fc}', '{fc}', 10, 20, 5, 1.0, 50.0, 10.0)"))
            # Insert food
            await session.execute(text(f"INSERT INTO foods (node_id, food_class, health, spoiled, claimed, reserved) VALUES ('locker-01', '{fc}', 100, false, false, false)"))
            
        await session.commit()
        print("Demo data inserted!")

if __name__ == "__main__":
    asyncio.run(main())
