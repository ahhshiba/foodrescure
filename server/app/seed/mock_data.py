"""Mock data generator — 30 days of rich, demo-friendly history.

Separate from config_seed (tunable constants) and dev_seed (M2 smoke account).
Produces dozens of players, several campus nodes, ~30 days of rescue
transactions with a day/night rhythm + lunch/dinner peaks + uneven node load,
purity feedback, an hourly entropy time-series, and a slate of *current*
unclaimed food (placed_at in the PAST so the decay engine yields varied health).

Run (fresh-ish DB):
    docker compose run --rm api python -m app.seed.mock_data
Re-run from scratch (wipes transactional tables, keeps config):
    docker compose run --rm api python -m app.seed.mock_data --reset
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import math
import random
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, text

from app.db.models import (
    EntropySnapshot,
    Feedback,
    Food,
    FoodClass,
    Node,
    Transaction,
    User,
)
from app.db.session import AsyncSessionLocal
from app.engine import economy
from app.security import hash_password

log = logging.getLogger("glitch.mock")

SEED = 42
N_USERS = 30
N_DAYS = 30
MOCK_USER_PREFIX = "agent_"

NODES = [
    {"id": "node-01", "name": "Cafeteria North", "location": "Bldg A 1F", "lat": 25.0173, "lng": 121.5398},
    {"id": "node-02", "name": "Library Kiosk", "location": "Bldg B 2F", "lat": 25.0181, "lng": 121.5405},
    {"id": "node-03", "name": "Engineering Hub", "location": "Bldg C 1F", "lat": 25.0165, "lng": 121.5412},
    {"id": "node-04", "name": "Sports Complex", "location": "Gym 1F", "lat": 25.0158, "lng": 121.5389},
    {"id": "node-05", "name": "Dorm East", "location": "Dorm 3 G/F", "lat": 25.0190, "lng": 121.5420},
    {"id": "node-06", "name": "Med School", "location": "Bldg D 2F", "lat": 25.0149, "lng": 121.5401},
]

# Relative busyness per node (uneven load).
NODE_WEIGHTS = [3.0, 2.0, 2.5, 1.0, 1.5, 1.2]


def _weighted_hour(rng: random.Random) -> int:
    """Pick an hour with lunch (11-13) and dinner (17-19) peaks."""
    weights = [1.0] * 24
    for h in (11, 12, 13):
        weights[h] = 6.0
    for h in (17, 18, 19):
        weights[h] = 5.0
    for h in range(0, 6):
        weights[h] = 0.3
    return rng.choices(range(24), weights=weights, k=1)[0]


async def _reset(session) -> None:
    log.info("Resetting transactional tables (config tables preserved)…")
    await session.execute(
        text(
            "TRUNCATE feedback, bounty_progress, transactions, nanos_inventory, "
            "cards, foods, entropy_snapshots, users RESTART IDENTITY CASCADE"
        )
    )
    await session.commit()


async def generate(reset: bool) -> None:
    rng = random.Random(SEED)
    now = datetime.now(UTC)

    async with AsyncSessionLocal() as session:
        if reset:
            await _reset(session)

        existing = (
            await session.execute(
                select(func.count()).select_from(User).where(User.username.like(f"{MOCK_USER_PREFIX}%"))
            )
        ).scalar_one()
        if existing and not reset:
            log.warning(
                "Mock data already present (%d agents). Use --reset to regenerate.", existing
            )
            return

        # ---- nodes (create missing, mark online for the topology view) ----
        for nd in NODES:
            node = await session.get(Node, nd["id"])
            if node is None:
                node = Node(**nd)
                session.add(node)
            node.status = "online"
            node.last_heartbeat = now
        await session.flush()

        nutrition = await economy.load_nutrition_map(session)
        cfg = await economy.load_config(session)
        classes = list(nutrition.keys())
        if not classes:
            log.error("food_classes empty — run config_seed first.")
            return
        xp_base = float(cfg.get("level_xp_base", 100))
        xp_growth = float(cfg.get("level_xp_growth", 1.5))
        spoil_threshold = float(cfg.get("spoil_health_threshold", 20.0))

        # ---- users ----
        users: list[User] = []
        for i in range(N_USERS):
            u = User(
                username=f"{MOCK_USER_PREFIX}{i:02d}",
                email=f"agent{i:02d}@glitch.city",
                password_hash=hash_password("password123"),
            )
            session.add(u)
            users.append(u)
        await session.flush()  # assign ids

        totals = {u.id: {"protein": 0.0, "carbs": 0.0, "lipids": 0.0, "xp": 0} for u in users}

        # ---- 30 days of rescue transactions ----
        txn_counter = 0
        feedback_rows: list[Feedback] = []
        for day in range(N_DAYS):
            day_base = now - timedelta(days=day)
            # weekends a touch busier
            events = rng.randint(18, 36)
            for _ in range(events):
                hour = _weighted_hour(rng)
                ts = day_base.replace(
                    hour=hour, minute=rng.randint(0, 59), second=rng.randint(0, 59), microsecond=0
                )
                if ts > now:
                    continue
                node_idx = rng.choices(range(len(NODES)), weights=NODE_WEIGHTS, k=1)[0]
                node_id = NODES[node_idx]["id"]
                user = rng.choice(users)
                cls = rng.choice(classes)
                count = rng.randint(1, 3)
                nut = nutrition[cls]
                gains = {
                    "protein": nut.protein * count,
                    "carbs": nut.carbs * count,
                    "lipids": nut.lipids * count,
                }
                xp = int(
                    gains["protein"] * float(cfg.get("xp_per_protein", 1.0))
                    + gains["carbs"] * float(cfg.get("xp_per_carbs", 0.5))
                    + gains["lipids"] * float(cfg.get("xp_per_lipids", 1.5))
                )
                txn_counter += 1
                txn = Transaction(
                    txn_id=f"mock-{txn_counter:06d}",
                    user_id=user.id,
                    node_id=node_id,
                    items_json=[{"class": cls, "count": count, "confidence": 0.9}],
                    gains_json=gains,
                    xp_awarded=xp,
                    created_at=ts,
                )
                session.add(txn)
                # claimed historical food instance(s)
                for _c in range(count):
                    session.add(
                        Food(
                            node_id=node_id,
                            food_class=cls,
                            placed_at=ts - timedelta(hours=rng.uniform(1, 6)),
                            health=rng.uniform(25, 90),
                            spoiled=False,
                            claimed=True,
                            claimed_by=user.id,
                        )
                    )
                t = totals[user.id]
                t["protein"] += gains["protein"]
                t["carbs"] += gains["carbs"]
                t["lipids"] += gains["lipids"]
                t["xp"] += xp

                # ~60% leave a purity rating (skewed positive)
                if rng.random() < 0.6:
                    await session.flush()  # ensure txn.id
                    stars = rng.choices([1, 2, 3, 4, 5], weights=[3, 6, 14, 37, 40], k=1)[0]
                    feedback_rows.append(
                        Feedback(transaction_id=txn.id, user_id=user.id, purity_stars=stars)
                    )

        session.add_all(feedback_rows)

        # ---- apply accumulated totals to users ----
        for u in users:
            t = totals[u.id]
            u.protein = round(t["protein"], 1)
            u.carbs = round(t["carbs"], 1)
            u.lipids = round(t["lipids"], 1)
            u.xp = t["xp"]
            u.level = economy.level_for_xp(t["xp"], xp_base, xp_growth)

        # ---- current unclaimed inventory (placed_at in the past => varied health) ----
        for node in NODES:
            for _ in range(rng.randint(4, 9)):
                cls = rng.choice(classes)
                age_h = rng.uniform(0.5, 26)
                placed = now - timedelta(hours=age_h)
                r_base = (await session.get(FoodClass, cls)).base_decay_rate
                health = max(0.0, round(100 - r_base * 1.05 * age_h, 1))
                session.add(
                    Food(
                        node_id=node["id"],
                        food_class=cls,
                        placed_at=placed,
                        health=health,
                        spoiled=health < spoil_threshold,
                        claimed=False,
                    )
                )

        # ---- hourly entropy time-series (sinusoidal day/night wave) ----
        snaps: list[EntropySnapshot] = []
        for h in range(N_DAYS * 24):
            ts = now - timedelta(hours=h)
            hour_of_day = ts.hour
            # entropy peaks pre-dawn (food sat overnight), dips after meal peaks
            wave = math.sin((hour_of_day - 3) / 24 * 2 * math.pi)
            total = round(max(0.0, 6.0 + 4.0 * wave + rng.uniform(-1.2, 1.2)), 3)
            per_node = {
                NODES[i]["id"]: round(total * NODE_WEIGHTS[i] / sum(NODE_WEIGHTS), 3)
                for i in range(len(NODES))
            }
            snaps.append(
                EntropySnapshot(ts=ts, total_entropy=total, payload_json={"per_node": per_node})
            )
        session.add_all(snaps)

        await session.commit()

    log.info(
        "Mock data: %d users, %d nodes, %d transactions, %d feedback, %d entropy snapshots",
        N_USERS,
        len(NODES),
        txn_counter,
        len(feedback_rows),
        len(snaps),
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s :: %(message)s")
    ap = argparse.ArgumentParser(description="Generate 30 days of mock data")
    ap.add_argument("--reset", action="store_true", help="wipe transactional tables first")
    args = ap.parse_args()
    asyncio.run(generate(args.reset))


if __name__ == "__main__":
    main()
