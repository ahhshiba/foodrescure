"""Entropy engine (minimal M2 version).

Total entropy = sum over UNCLAIMED, not-yet-consumed food of its decay fraction
(how far health has fallen from 100). M3 expands this into a scheduled snapshot
writer; here we compute on demand after each status event.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Food


def food_entropy(health: float) -> float:
    """Per-food entropy contribution: 0 at full health, 1 fully decayed."""
    frac = (100.0 - health) / 100.0
    return min(max(frac, 0.0), 1.0)


def glitch_intensity(total_entropy: float, ceiling: float) -> float:
    """Normalize total entropy to a 0..1 glitch intensity for the UI."""
    if ceiling <= 0:
        return 0.0
    return min(total_entropy / ceiling, 1.0)


@dataclass
class EntropyState:
    total: float
    per_node: dict[str, float]


async def compute_entropy(session: AsyncSession) -> EntropyState:
    rows = (await session.execute(select(Food).where(Food.claimed.is_(False)))).scalars().all()
    per_node: dict[str, float] = {}
    total = 0.0
    for food in rows:
        e = food_entropy(food.health)
        total += e
        per_node[food.node_id] = per_node.get(food.node_id, 0.0) + e
    return EntropyState(
        total=round(total, 4), per_node={k: round(v, 4) for k, v in per_node.items()}
    )
