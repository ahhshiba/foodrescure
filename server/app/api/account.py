"""Account endpoints — me, card claim, inventory, nanos upgrade."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Card, NanosInventory, NanosType, User
from app.db.session import get_session
from app.engine import economy
from app.schemas.rest import (
    ClaimCardRequest,
    InventoryResponse,
    MeResponse,
    NanosOut,
    UpgradeResponse,
)

router = APIRouter(tags=["account"])


@router.get("/me", response_model=MeResponse)
async def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse.model_validate(user)


@router.post("/cards/claim", response_model=MeResponse)
async def claim_card(
    body: ClaimCardRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MeResponse:
    card = (await session.execute(select(Card).where(Card.rfid == body.rfid))).scalar_one_or_none()
    if card is None or card.claim_code != body.claim_code:
        raise HTTPException(status_code=404, detail="No pending card matches that rfid + code")
    if card.user_id is not None and card.user_id != user.id:
        raise HTTPException(status_code=409, detail="Card already claimed by another account")
    card.user_id = user.id
    card.claimed_at = datetime.now(UTC)
    await session.commit()
    return MeResponse.model_validate(user)


@router.get("/inventory", response_model=InventoryResponse)
async def inventory(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> InventoryResponse:
    nanos = (
        (await session.execute(select(NanosInventory).where(NanosInventory.user_id == user.id)))
        .scalars()
        .all()
    )
    return InventoryResponse(
        protein=user.protein,
        carbs=user.carbs,
        lipids=user.lipids,
        nanos=[NanosOut.model_validate(n) for n in nanos],
    )


@router.post("/nanos/{nanos_type}/upgrade", response_model=UpgradeResponse)
async def upgrade_nanos(
    nanos_type: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UpgradeResponse:
    nt = await session.get(NanosType, nanos_type)
    if nt is None:
        raise HTTPException(status_code=404, detail=f"Unknown nanos type '{nanos_type}'")

    inv = (
        await session.execute(
            select(NanosInventory).where(
                NanosInventory.user_id == user.id, NanosInventory.nanos_type == nanos_type
            )
        )
    ).scalar_one_or_none()
    if inv is None:
        inv = NanosInventory(user_id=user.id, nanos_type=nanos_type, level=1)
        session.add(inv)

    target_level = inv.level + 1
    if target_level > nt.max_level:
        raise HTTPException(status_code=409, detail="Already at max level")

    cost = economy.upgrade_cost(nt.upgrade_cost_json, target_level)
    if not cost:
        raise HTTPException(status_code=422, detail=f"No cost defined for level {target_level}")

    balances = {"protein": user.protein, "carbs": user.carbs, "lipids": user.lipids}
    for material, amount in cost.items():
        have = balances.get(material, 0.0)
        if have < amount:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient {material}: need {amount}, have {have}",
            )

    user.protein -= cost.get("protein", 0.0)
    user.carbs -= cost.get("carbs", 0.0)
    user.lipids -= cost.get("lipids", 0.0)
    inv.level = target_level
    await session.commit()
    return UpgradeResponse(nanos_type=nanos_type, new_level=target_level, spent=cost)
