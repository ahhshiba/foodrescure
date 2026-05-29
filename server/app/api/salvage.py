"""Virtual salvage endpoint — lets any logged-in player rescue a node's stock
without a physical RFID swipe. Shares the settlement engine with the MQTT
bridge so the economy rules live in exactly one place.
"""

from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Food, Node, User
from app.db.session import get_session
from app.engine import economy, salvage
from app.schemas.mqtt import StatusItem
from app.schemas.rest import SalvageRequest, SalvageResponse
from app.schemas.ws import UnlockSuccess
from app.ws.events import envelope
from app.ws.manager import manager

router = APIRouter(prefix="/nodes", tags=["salvage"])

# Per-user click-debounce (process-local, like the bridge rate limiter).
_last_salvage: dict[int, float] = {}


@router.post("/{node_id}/salvage", response_model=SalvageResponse)
async def salvage_node(
    node_id: str,
    body: SalvageRequest = SalvageRequest(),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SalvageResponse:
    node = await session.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    if node.status != "online":
        raise HTTPException(status_code=409, detail="Node is offline")

    cfg = await economy.load_config(session)

    # Click-debounce cooldown.
    cooldown = float(cfg.get("salvage_cooldown_s", 3))
    now = time.monotonic()
    last = _last_salvage.get(user.id)
    if last is not None and now - last < cooldown:
        wait = round(cooldown - (now - last), 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Nanos still recharging — try again in {wait}s",
        )

    # Most-urgent-first: rescue the lowest-health unclaimed food.
    foods = (
        (
            await session.execute(
                select(Food)
                .where(Food.node_id == node_id, Food.claimed.is_(False))
                .order_by(Food.health.asc())
                .limit(body.count)
            )
        )
        .scalars()
        .all()
    )
    if not foods:
        raise HTTPException(status_code=409, detail="Nothing left to salvage at this node")

    # Group selected foods into per-class items for the settlement engine.
    counts: dict[str, int] = {}
    for f in foods:
        counts[f.food_class] = counts.get(f.food_class, 0) + 1
    items = [
        StatusItem.model_validate({"class": cls, "count": n, "confidence": 1.0})
        for cls, n in counts.items()
    ]

    _last_salvage[user.id] = now
    txn_id = f"txn-{uuid.uuid4().hex[:16]}"

    # Fire the unlock animation, then settle.
    await manager.send_to_user(
        user.id, envelope("unlock_success", UnlockSuccess(txn_id=txn_id, node_id=node_id))
    )
    result = await salvage.process_salvage(
        session, user=user, node_id=node_id, items=items, txn_id=txn_id
    )
    return SalvageResponse(
        txn_id=result.txn_id, gains=result.gains, xp=result.xp, claimed=result.claimed
    )
