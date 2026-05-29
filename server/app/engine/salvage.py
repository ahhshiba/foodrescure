"""Shared salvage settlement engine.

Single source of the economy/settlement rules used by BOTH real RFID swipes
(via the MQTT bridge) and virtual salvage (via the REST API). Deconstructs
items into biomaterial, claims the food, credits the player, advances daily
bounties, writes the Transaction, and broadcasts the WS events.

`unlock_success` is intentionally NOT emitted here — that belongs to the
"unlock moment" and is sent by each caller (bridge `_on_auth` / salvage API).
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Food, Transaction, User
from app.engine import bounties, economy, entropy
from app.engine.bounties import RescueEvent
from app.schemas.mqtt import StatusItem
from app.schemas.ws import (
    BountyCompleted,
    EntropyUpdate,
    ResourceCredited,
    ResourceGains,
)
from app.ws.events import envelope
from app.ws.manager import manager

log = logging.getLogger("glitch.salvage")


@dataclass
class SalvageResult:
    txn_id: str
    gains: dict[str, float]
    xp: int
    claimed: int
    spoiled: int
    completed_bounties: list[int] = field(default_factory=list)
    unknown_classes: list[str] = field(default_factory=list)


async def mark_foods_claimed(
    session: AsyncSession, node_id: str, items: list[StatusItem], user_id: int
) -> tuple[int, int]:
    """Claim up to `count` unclaimed foods per class. Returns (claimed, spoiled)."""
    claimed = 0
    spoiled = 0
    for item in items:
        foods = (
            (
                await session.execute(
                    select(Food)
                    .where(
                        Food.node_id == node_id,
                        Food.food_class == item.class_,
                        Food.claimed.is_(False),
                    )
                    .limit(item.count)
                )
            )
            .scalars()
            .all()
        )
        for food in foods:
            food.claimed = True
            food.claimed_by = user_id
            claimed += 1
            if food.spoiled:
                spoiled += 1
    return claimed, spoiled


async def node_health_avg(session: AsyncSession, node_id: str) -> float:
    foods = (
        (
            await session.execute(
                select(Food).where(Food.node_id == node_id, Food.claimed.is_(False))
            )
        )
        .scalars()
        .all()
    )
    if not foods:
        return 0.0
    return round(sum(f.health for f in foods) / len(foods), 2)


async def process_salvage(
    session: AsyncSession,
    *,
    user: User,
    node_id: str,
    items: list[StatusItem],
    txn_id: str | None = None,
) -> SalvageResult:
    """Settle a salvage for `user` at `node_id`. Commits and broadcasts WS events.

    `user` must be attached to `session`. If `txn_id` is given and a pending
    transaction exists (real RFID flow), it is completed in place; otherwise a
    new transaction is created (virtual salvage).
    """
    nutrition = await economy.load_nutrition_map(session)
    cfg = await economy.load_config(session)
    result = economy.deconstruct(items, nutrition, cfg)
    if result.unknown_classes:
        log.warning("Unknown food classes: %s", result.unknown_classes)

    txn: Transaction | None = None
    if txn_id is not None:
        txn = (
            await session.execute(select(Transaction).where(Transaction.txn_id == txn_id))
        ).scalar_one_or_none()
    if txn is None:
        txn_id = txn_id or f"txn-{uuid.uuid4().hex[:16]}"
        txn = Transaction(txn_id=txn_id, user_id=user.id, node_id=node_id)
        session.add(txn)
    assert txn_id is not None

    txn.items_json = [it.model_dump(by_alias=True) for it in items]
    txn.gains_json = result.gains
    txn.xp_awarded = result.xp

    claimed, spoiled = await mark_foods_claimed(session, node_id, items, user.id)

    user.protein += result.gains["protein"]
    user.carbs += result.gains["carbs"]
    user.lipids += result.gains["lipids"]
    user.xp += result.xp
    user.level = economy.level_for_xp(
        user.xp,
        float(cfg.get("level_xp_base", 100)),
        float(cfg.get("level_xp_growth", 1.5)),
    )

    health_avg = await node_health_avg(session, node_id)
    warning = health_avg < float(cfg.get("node_warning_health", 50.0))
    completed = await bounties.record_rescue(
        session,
        user.id,
        datetime.now(UTC).date(),
        RescueEvent(meals=claimed, spoiled=spoiled, warning_node=warning),
    )

    await session.commit()
    user_id = user.id

    ent = await entropy.compute_entropy(session)
    await manager.send_to_user(
        user_id,
        envelope(
            "resource_credited",
            ResourceCredited(txn_id=txn_id, gains=ResourceGains(**result.gains), xp=result.xp),
        ),
    )
    await manager.broadcast(
        envelope(
            "entropy_update", EntropyUpdate(total_entropy=ent.total, node_entropies=ent.per_node)
        )
    )
    for bounty_id in completed:
        await manager.send_to_user(
            user_id, envelope("bounty_completed", BountyCompleted(bounty_id=bounty_id))
        )
        log.info("BOUNTY completed id=%s user=%s", bounty_id, user_id)

    log.info(
        "SALVAGE txn=%s user=%s node=%s gains=%s xp=%s",
        txn_id,
        user_id,
        node_id,
        result.gains,
        result.xp,
    )
    return SalvageResult(
        txn_id=txn_id,
        gains=result.gains,
        xp=result.xp,
        claimed=claimed,
        spoiled=spoiled,
        completed_bounties=completed,
        unknown_classes=result.unknown_classes,
    )
