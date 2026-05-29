"""Economy engine — deconstruct meals into biomaterial + XP/level math.

The pure functions here take plain data (no DB/ORM) so they are trivially unit
testable. All coefficients arrive from `economy_config` / `food_classes` —
nothing is hardcoded.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EconomyConfig, FoodClass
from app.schemas.mqtt import StatusItem


@dataclass(frozen=True)
class Nutrition:
    protein: float = 0.0
    carbs: float = 0.0
    lipids: float = 0.0


@dataclass
class DeconstructResult:
    gains: dict[str, float] = field(
        default_factory=lambda: {"protein": 0.0, "carbs": 0.0, "lipids": 0.0}
    )
    xp: int = 0
    unknown_classes: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------
# Pure functions (unit tested in tests/test_economy.py)
# --------------------------------------------------------------------------
def deconstruct(
    items: list[StatusItem],
    nutrition_by_class: dict[str, Nutrition],
    xp_weights: dict[str, float],
) -> DeconstructResult:
    """Convert detected meal classes (class x count) into biomaterial + XP.

    Unknown classes (not in food_classes) are recorded and skipped, not fatal.
    """
    result = DeconstructResult()
    for item in items:
        nut = nutrition_by_class.get(item.class_)
        if nut is None:
            result.unknown_classes.append(item.class_)
            continue
        result.gains["protein"] += nut.protein * item.count
        result.gains["carbs"] += nut.carbs * item.count
        result.gains["lipids"] += nut.lipids * item.count

    result.xp = int(
        result.gains["protein"] * xp_weights.get("xp_per_protein", 1.0)
        + result.gains["carbs"] * xp_weights.get("xp_per_carbs", 0.5)
        + result.gains["lipids"] * xp_weights.get("xp_per_lipids", 1.5)
    )
    return result


def xp_to_reach_level(level: int, base: float, growth: float) -> float:
    """Cumulative XP required to *be* at `level` (level 1 == 0 XP)."""
    if level <= 1:
        return 0.0
    total = 0.0
    step = base
    for _ in range(level - 1):
        total += step
        step *= growth
    return total


def level_for_xp(xp: float, base: float, growth: float, cap: int = 999) -> int:
    """Highest level whose cumulative XP threshold is <= xp."""
    level = 1
    while level < cap and xp >= xp_to_reach_level(level + 1, base, growth):
        level += 1
    return level


def upgrade_cost(upgrade_cost_json: dict[str, Any], target_level: int) -> dict[str, float]:
    """Cost (biomaterial) to reach `target_level`. Empty if not defined."""
    raw = upgrade_cost_json.get(str(target_level), {})
    return {k: float(v) for k, v in raw.items()}


# --------------------------------------------------------------------------
# DB repo helpers
# --------------------------------------------------------------------------
async def load_nutrition_map(session: AsyncSession) -> dict[str, Nutrition]:
    rows = (await session.execute(select(FoodClass))).scalars().all()
    return {
        fc.class_name: Nutrition(protein=fc.protein, carbs=fc.carbs, lipids=fc.lipids)
        for fc in rows
    }


async def load_config(session: AsyncSession) -> dict[str, Any]:
    rows = (await session.execute(select(EconomyConfig))).scalars().all()
    return {row.key: row.value_json for row in rows}
