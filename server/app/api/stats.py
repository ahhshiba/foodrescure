"""Stats endpoints for the UI2 ESG war room (public, no auth)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Pagination
from app.db.models import EntropySnapshot, Feedback, Food, FoodClass, Transaction, User
from app.db.session import get_session
from app.schemas.rest import (
    EntropyPoint,
    EntropyStats,
    EsgStats,
    FleetAccuracy,
    LeaderboardEntry,
    Page,
    TransactionOut,
)

router = APIRouter(tags=["stats"])


@router.get("/stats/esg", response_model=EsgStats)
async def esg(session: AsyncSession = Depends(get_session)) -> EsgStats:
    row = (
        await session.execute(
            select(
                func.coalesce(func.sum(FoodClass.co2_saved_g), 0.0),
                func.coalesce(func.sum(FoodClass.money_saved), 0.0),
                func.count(),
            )
            .select_from(Food)
            .join(FoodClass, Food.food_class == FoodClass.class_name)
            .where(Food.claimed.is_(True))
        )
    ).one()
    return EsgStats(co2_saved_g=float(row[0]), money_saved=float(row[1]), meals_rescued=int(row[2]))


@router.get("/stats/entropy", response_model=EntropyStats)
async def entropy_stats(session: AsyncSession = Depends(get_session)) -> EntropyStats:
    snaps = (
        (
            await session.execute(
                select(EntropySnapshot).order_by(desc(EntropySnapshot.ts)).limit(200)
            )
        )
        .scalars()
        .all()
    )
    snaps = list(reversed(snaps))  # chronological for charting
    series = [EntropyPoint(ts=s.ts, total_entropy=s.total_entropy) for s in snaps]
    latest = series[-1].total_entropy if series else 0.0
    return EntropyStats(total_entropy=latest, series=series)


@router.get("/stats/fleet-accuracy", response_model=FleetAccuracy)
async def fleet_accuracy(session: AsyncSession = Depends(get_session)) -> FleetAccuracy:
    """Placeholder statistic until a real freshness model is wired in.

    accuracy = fraction of purity ratings >= 4 stars; sample = total ratings.
    """
    total = (await session.execute(select(func.count()).select_from(Feedback))).scalar_one()
    if not total:
        return FleetAccuracy(accuracy=0.0, sample_size=0)
    good = (
        await session.execute(
            select(func.count()).select_from(Feedback).where(Feedback.purity_stars >= 4)
        )
    ).scalar_one()
    return FleetAccuracy(accuracy=round(good / total, 4), sample_size=int(total))


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(session: AsyncSession = Depends(get_session)) -> list[LeaderboardEntry]:
    users = (await session.execute(select(User).order_by(desc(User.xp)).limit(20))).scalars().all()
    return [LeaderboardEntry(username=u.username, xp=u.xp, level=u.level) for u in users]


@router.get("/transactions", response_model=Page)
async def transactions(
    page: Pagination = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page:
    total = (await session.execute(select(func.count()).select_from(Transaction))).scalar_one()
    rows = (
        (
            await session.execute(
                select(Transaction)
                .order_by(desc(Transaction.created_at))
                .offset(page.offset)
                .limit(page.limit)
            )
        )
        .scalars()
        .all()
    )
    return Page(
        items=[TransactionOut.model_validate(t).model_dump(mode="json") for t in rows],
        total=int(total),
        page=page.page,
        page_size=page.page_size,
    )
