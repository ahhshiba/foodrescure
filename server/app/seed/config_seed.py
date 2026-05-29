"""Seed the config tables (food_classes, nanos_types, economy_config).

Idempotent upsert — safe to re-run. Business/mock data is a separate script
(added in M6: `mock_data.py`).

Run inside the api container:
    docker compose run --rm api python -m app.seed.config_seed
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy.dialects.postgresql import insert

from app.db.models import EconomyConfig, FoodClass, NanosType
from app.db.session import AsyncSessionLocal
from app.seed.config_data import ECONOMY_CONFIG, FOOD_CLASSES, NANOS_TYPES

log = logging.getLogger("glitch.seed")


async def seed_config() -> None:
    async with AsyncSessionLocal() as session:
        # food_classes — refresh display names on conflict so zh names propagate.
        fc_stmt = insert(FoodClass).values(FOOD_CLASSES)
        fc_stmt = fc_stmt.on_conflict_do_update(
            index_elements=["class_name"],
            set_={
                "display_name": fc_stmt.excluded.display_name,
                "display_name_zh": fc_stmt.excluded.display_name_zh,
            },
        )
        await session.execute(fc_stmt)
        # nanos_types
        await session.execute(
            insert(NanosType).values(NANOS_TYPES).on_conflict_do_nothing(index_elements=["type"])
        )
        # economy_config — update value/description on conflict so edits in
        # config_data.py propagate on re-seed.
        stmt = insert(EconomyConfig).values(ECONOMY_CONFIG)
        stmt = stmt.on_conflict_do_update(
            index_elements=["key"],
            set_={
                "value_json": stmt.excluded.value_json,
                "description": stmt.excluded.description,
            },
        )
        await session.execute(stmt)

        await session.commit()
    log.info(
        "Seeded %d food_classes, %d nanos_types, %d economy_config rows",
        len(FOOD_CLASSES),
        len(NANOS_TYPES),
        len(ECONOMY_CONFIG),
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s :: %(message)s")
    asyncio.run(seed_config())


if __name__ == "__main__":
    main()
