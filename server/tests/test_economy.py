"""Unit tests for the pure economy functions (no DB)."""

from __future__ import annotations

from app.engine.economy import (
    Nutrition,
    deconstruct,
    level_for_xp,
    upgrade_cost,
    xp_to_reach_level,
)
from app.schemas.mqtt import StatusItem


def _item(class_name: str, count: int) -> StatusItem:
    return StatusItem.model_validate({"class": class_name, "count": count, "confidence": 0.9})


NUTRITION = {
    "porkchop_bento": Nutrition(protein=30, carbs=45, lipids=20),
    "rice_ball": Nutrition(protein=6, carbs=35, lipids=4),
}
WEIGHTS = {"xp_per_protein": 1.0, "xp_per_carbs": 0.5, "xp_per_lipids": 1.5}


def test_deconstruct_single() -> None:
    res = deconstruct([_item("porkchop_bento", 1)], NUTRITION, WEIGHTS)
    assert res.gains == {"protein": 30.0, "carbs": 45.0, "lipids": 20.0}
    # xp = 30*1 + 45*0.5 + 20*1.5 = 30 + 22.5 + 30 = 82
    assert res.xp == 82
    assert res.unknown_classes == []


def test_deconstruct_multiple_and_counts() -> None:
    res = deconstruct([_item("porkchop_bento", 2), _item("rice_ball", 3)], NUTRITION, WEIGHTS)
    assert res.gains["protein"] == 30 * 2 + 6 * 3
    assert res.gains["carbs"] == 45 * 2 + 35 * 3
    assert res.gains["lipids"] == 20 * 2 + 4 * 3


def test_deconstruct_unknown_class_is_skipped() -> None:
    res = deconstruct([_item("mystery_meat", 5), _item("rice_ball", 1)], NUTRITION, WEIGHTS)
    assert "mystery_meat" in res.unknown_classes
    assert res.gains == {"protein": 6.0, "carbs": 35.0, "lipids": 4.0}


def test_xp_to_reach_level() -> None:
    # base=100, growth=1.5: L2=100, L3=100+150=250, L4=250+225=475
    assert xp_to_reach_level(1, 100, 1.5) == 0.0
    assert xp_to_reach_level(2, 100, 1.5) == 100.0
    assert xp_to_reach_level(3, 100, 1.5) == 250.0
    assert xp_to_reach_level(4, 100, 1.5) == 475.0


def test_level_for_xp() -> None:
    assert level_for_xp(0, 100, 1.5) == 1
    assert level_for_xp(99, 100, 1.5) == 1
    assert level_for_xp(100, 100, 1.5) == 2
    assert level_for_xp(249, 100, 1.5) == 2
    assert level_for_xp(250, 100, 1.5) == 3
    assert level_for_xp(10_000, 100, 1.5) >= 4


def test_upgrade_cost() -> None:
    costs = {"2": {"protein": 40, "carbs": 10}, "3": {"protein": 90}}
    assert upgrade_cost(costs, 2) == {"protein": 40.0, "carbs": 10.0}
    assert upgrade_cost(costs, 3) == {"protein": 90.0}
    assert upgrade_cost(costs, 5) == {}  # undefined level -> empty
