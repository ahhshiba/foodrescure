"""Unit tests for the pure bounty functions."""

from __future__ import annotations

from datetime import date

from app.engine.bounties import (
    RescueEvent,
    apply_progress,
    build_daily_bounties,
    progress_increment,
)

TEMPLATES = [
    {
        "code": "daily_rescue",
        "type": "rescue_count",
        "target": 3,
        "description": "Salvage 3 meals",
        "reward": {"protein": 25, "xp": 60},
    },
    {
        "code": "spoiled_hero",
        "type": "rescue_spoiled",
        "target": 1,
        "description": "Salvage 1 spoiled",
        "reward": {"xp": 90},
    },
]


def test_build_daily_bounties() -> None:
    rows = build_daily_bounties(TEMPLATES, date(2026, 5, 29))
    assert len(rows) == 2
    assert rows[0]["date"] == date(2026, 5, 29)
    assert rows[0]["spec_json"]["code"] == "daily_rescue"
    assert rows[0]["spec_json"]["target"] == 3
    assert rows[0]["reward_json"] == {"protein": 25, "xp": 60}


def test_progress_increment_by_type() -> None:
    count_spec = {"type": "rescue_count", "target": 3}
    spoiled_spec = {"type": "rescue_spoiled", "target": 1}
    warning_spec = {"type": "rescue_warning", "target": 2}

    ev = RescueEvent(meals=2, spoiled=1, warning_node=False)
    assert progress_increment(count_spec, ev) == 2.0
    assert progress_increment(spoiled_spec, ev) == 1.0
    assert progress_increment(warning_spec, ev) == 0.0  # node not in warning

    ev_warn = RescueEvent(meals=2, spoiled=0, warning_node=True)
    assert progress_increment(warning_spec, ev_warn) == 2.0


def test_progress_increment_unknown_type() -> None:
    assert progress_increment({"type": "mystery", "target": 1}, RescueEvent(meals=9)) == 0.0


def test_apply_progress_completion() -> None:
    spec = {"type": "rescue_count", "target": 3}
    p, done = apply_progress(spec, 0.0, RescueEvent(meals=2))
    assert (p, done) == (2.0, False)
    p, done = apply_progress(spec, p, RescueEvent(meals=1))
    assert (p, done) == (3.0, True)
    p, done = apply_progress(spec, p, RescueEvent(meals=5))
    assert done is True  # stays completed
