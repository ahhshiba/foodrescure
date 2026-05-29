"""Daily bounty engine — generation from templates + progress tracking.

Templates live in economy_config['bounty_templates'] (config-driven). The pure
functions are unit tested in tests/test_bounties.py; DB wrappers persist rows
and report which bounties were newly completed (so the bridge can broadcast).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Bounty, BountyProgress


@dataclass
class RescueEvent:
    """What a single rescue (one status report) contributed."""

    meals: int = 0
    spoiled: int = 0
    warning_node: bool = False


# --------------------------------------------------------------------------
# Pure functions
# --------------------------------------------------------------------------
def build_daily_bounties(templates: list[dict[str, Any]], day: date) -> list[dict[str, Any]]:
    """Turn templates into bounty rows for `day` (spec_json + reward_json)."""
    out: list[dict[str, Any]] = []
    for tpl in templates:
        spec = {
            "code": tpl["code"],
            "type": tpl["type"],
            "target": tpl["target"],
            "description": tpl.get("description", ""),
        }
        out.append({"date": day, "spec_json": spec, "reward_json": tpl.get("reward", {})})
    return out


def progress_increment(spec: dict[str, Any], event: RescueEvent) -> float:
    """How much a rescue advances a bounty of this type."""
    btype = spec.get("type")
    if btype == "rescue_count":
        return float(event.meals)
    if btype == "rescue_spoiled":
        return float(event.spoiled)
    if btype == "rescue_warning":
        return float(event.meals) if event.warning_node else 0.0
    return 0.0


def apply_progress(spec: dict[str, Any], current: float, event: RescueEvent) -> tuple[float, bool]:
    """Return (new_progress, completed_now-or-already)."""
    target = float(spec.get("target", 1))
    new_progress = current + progress_increment(spec, event)
    return new_progress, new_progress >= target


# --------------------------------------------------------------------------
# DB wrappers
# --------------------------------------------------------------------------
@dataclass
class GenerationResult:
    created: list[Bounty] = field(default_factory=list)
    skipped: bool = False


async def generate_daily_bounties(
    session: AsyncSession, templates: list[dict[str, Any]], day: date
) -> GenerationResult:
    """Idempotent: if bounties already exist for `day`, do nothing."""
    existing = (await session.execute(select(Bounty).where(Bounty.date == day))).scalars().first()
    if existing is not None:
        return GenerationResult(skipped=True)

    created: list[Bounty] = []
    for row in build_daily_bounties(templates, day):
        bounty = Bounty(
            date=row["date"], spec_json=row["spec_json"], reward_json=row["reward_json"]
        )
        session.add(bounty)
        created.append(bounty)
    await session.commit()
    return GenerationResult(created=created)


async def record_rescue(
    session: AsyncSession, user_id: int, day: date, event: RescueEvent
) -> list[int]:
    """Advance the user's progress on all of today's bounties.

    Returns the ids of bounties that became completed on THIS rescue.
    Caller is responsible for committing.
    """
    bounties = (await session.execute(select(Bounty).where(Bounty.date == day))).scalars().all()
    completed_now: list[int] = []
    for bounty in bounties:
        bp = (
            await session.execute(
                select(BountyProgress).where(
                    BountyProgress.bounty_id == bounty.id,
                    BountyProgress.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if bp is None:
            bp = BountyProgress(bounty_id=bounty.id, user_id=user_id, progress=0.0)
            session.add(bp)

        was_completed = bp.completed
        new_progress, completed = apply_progress(bounty.spec_json, bp.progress, event)
        bp.progress = new_progress
        bp.completed = completed
        if completed and not was_completed:
            completed_now.append(bounty.id)
    return completed_now
