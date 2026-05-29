"""Decay engine — freshness model + scheduled health updates.

health = 100 - (R_base * F_pkg * F_temp * F_humidity * t)

* t          : hours since the food was placed
* R_base     : per food_class base decay rate (food_classes.base_decay_rate)
* F_pkg      : per food packaging factor (foods.pkg_factor)
* F_temp     : 1.0 at/below threshold; exp(k*(temp-threshold)) above it
* F_humidity : 1 + coeff*(humidity - ref)

All coefficients come from economy_config / food_classes — nothing hardcoded.
The pure functions below are unit tested in tests/test_decay.py.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Food, FoodClass


def f_temp(temp_c: float, threshold_c: float, k: float) -> float:
    if temp_c <= threshold_c:
        return 1.0
    return math.exp(k * (temp_c - threshold_c))


def f_humidity(humidity_pct: float, ref_pct: float, coeff: float) -> float:
    # Never let humidity *slow* decay below a floor, and never go negative.
    return max(0.1, 1.0 + coeff * (humidity_pct - ref_pct))


def compute_health(
    age_hours: float,
    r_base: float,
    f_pkg: float,
    f_temp_v: float,
    f_humidity_v: float,
) -> float:
    decayed = r_base * f_pkg * f_temp_v * f_humidity_v * max(age_hours, 0.0)
    return round(min(max(100.0 - decayed, 0.0), 100.0), 2)


def is_spoiled(health: float, spoil_threshold: float) -> bool:
    return health < spoil_threshold


# --------------------------------------------------------------------------
# DB tick
# --------------------------------------------------------------------------
@dataclass
class DecayResult:
    updated: int
    newly_spoiled: int


async def load_decay_rates(session: AsyncSession) -> dict[str, float]:
    rows = (await session.execute(select(FoodClass))).scalars().all()
    return {fc.class_name: fc.base_decay_rate for fc in rows}


async def run_decay_tick(session: AsyncSession, config: dict) -> DecayResult:
    """Recompute health for every unclaimed food from its true age + env.

    Idempotent: health is an absolute function of age, so re-running is safe.
    """
    rates = await load_decay_rates(session)
    threshold = float(config.get("decay_temp_threshold_c", 25.0))
    k = float(config.get("decay_temp_k", 0.08))
    temp = float(config.get("env_temp_c", 24.0))
    humidity = float(config.get("env_humidity_pct", 65.0))
    hum_ref = float(config.get("decay_humidity_ref", 60.0))
    hum_coeff = float(config.get("decay_humidity_coeff", 0.01))
    spoil_threshold = float(config.get("spoil_health_threshold", 20.0))

    ft = f_temp(temp, threshold, k)
    fh = f_humidity(humidity, hum_ref, hum_coeff)
    now = datetime.now(UTC)

    foods = (await session.execute(select(Food).where(Food.claimed.is_(False)))).scalars().all()

    updated = 0
    newly_spoiled = 0
    for food in foods:
        placed = food.placed_at
        if placed.tzinfo is None:
            placed = placed.replace(tzinfo=UTC)
        age_hours = (now - placed).total_seconds() / 3600.0
        r_base = rates.get(food.food_class, 1.0)
        new_health = compute_health(age_hours, r_base, food.pkg_factor, ft, fh)
        spoiled = is_spoiled(new_health, spoil_threshold)
        if spoiled and not food.spoiled:
            newly_spoiled += 1
        food.health = new_health
        food.spoiled = spoiled
        updated += 1

    await session.commit()
    return DecayResult(updated=updated, newly_spoiled=newly_spoiled)
