"""Bounty endpoints — list today's bounties (+progress) and claim rewards."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Bounty, BountyProgress, User
from app.db.session import get_session
from app.engine import economy
from app.schemas.rest import BountyOut

router = APIRouter(prefix="/bounties", tags=["bounties"])


@router.get("", response_model=list[BountyOut])
async def list_bounties(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[BountyOut]:
    today = datetime.now(UTC).date()
    bounties = (await session.execute(select(Bounty).where(Bounty.date == today))).scalars().all()
    progress = {
        bp.bounty_id: bp
        for bp in (
            await session.execute(select(BountyProgress).where(BountyProgress.user_id == user.id))
        )
        .scalars()
        .all()
    }
    out: list[BountyOut] = []
    for b in bounties:
        bp = progress.get(b.id)
        out.append(
            BountyOut(
                id=b.id,
                spec_json=b.spec_json,
                reward_json=b.reward_json,
                progress=bp.progress if bp else 0.0,
                completed=bp.completed if bp else False,
                claimed=bp.claimed if bp else False,
            )
        )
    return out


@router.post("/{bounty_id}/claim", response_model=BountyOut)
async def claim_bounty(
    bounty_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BountyOut:
    bounty = await session.get(Bounty, bounty_id)
    if bounty is None:
        raise HTTPException(status_code=404, detail="Bounty not found")
    bp = (
        await session.execute(
            select(BountyProgress).where(
                BountyProgress.bounty_id == bounty_id, BountyProgress.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if bp is None or not bp.completed:
        raise HTTPException(status_code=409, detail="Bounty not completed yet")
    if bp.claimed:
        raise HTTPException(status_code=409, detail="Reward already claimed")

    reward = bounty.reward_json or {}
    user.protein += float(reward.get("protein", 0))
    user.carbs += float(reward.get("carbs", 0))
    user.lipids += float(reward.get("lipids", 0))
    if reward.get("xp"):
        cfg = await economy.load_config(session)
        user.xp += int(reward["xp"])
        user.level = economy.level_for_xp(
            user.xp, float(cfg.get("level_xp_base", 100)), float(cfg.get("level_xp_growth", 1.5))
        )
    bp.claimed = True
    await session.commit()
    return BountyOut(
        id=bounty.id,
        spec_json=bounty.spec_json,
        reward_json=bounty.reward_json,
        progress=bp.progress,
        completed=bp.completed,
        claimed=bp.claimed,
    )
