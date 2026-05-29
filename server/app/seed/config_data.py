"""Tunable config DATA — the single source for every economy constant.

Edit numbers here (or directly in the DB `economy_config` / `food_classes` /
`nanos_types` rows at demo time). No logic module is allowed to hardcode these.

`food_classes` keys MUST match the `class` strings the external Edge emits in
its `status` payload. The Edge team confirms its class list on delivery; keep
this aligned with that list.
"""

from __future__ import annotations

from typing import Any

# --------------------------------------------------------------------------
# Food classes: nutrition payout + decay + ESG savings per meal class.
# protein/carbs/lipids = biomaterial granted on deconstruct.
# base_decay_rate = R_base in the decay formula.
# --------------------------------------------------------------------------
FOOD_CLASSES: list[dict[str, Any]] = [
    {
        "class_name": "porkchop_bento",
        "display_name": "Porkchop Bento",
        "protein": 30.0,
        "carbs": 45.0,
        "lipids": 20.0,
        "base_decay_rate": 1.2,
        "co2_saved_g": 1800.0,
        "money_saved": 75.0,
    },
    {
        "class_name": "chicken_bento",
        "display_name": "Chicken Bento",
        "protein": 35.0,
        "carbs": 40.0,
        "lipids": 12.0,
        "base_decay_rate": 1.1,
        "co2_saved_g": 1500.0,
        "money_saved": 70.0,
    },
    {
        "class_name": "veggie_bento",
        "display_name": "Veggie Bento",
        "protein": 12.0,
        "carbs": 50.0,
        "lipids": 8.0,
        "base_decay_rate": 1.5,
        "co2_saved_g": 900.0,
        "money_saved": 60.0,
    },
    {
        "class_name": "rice_ball",
        "display_name": "Rice Ball",
        "protein": 6.0,
        "carbs": 35.0,
        "lipids": 4.0,
        "base_decay_rate": 0.9,
        "co2_saved_g": 400.0,
        "money_saved": 25.0,
    },
    {
        "class_name": "sandwich",
        "display_name": "Sandwich",
        "protein": 14.0,
        "carbs": 30.0,
        "lipids": 16.0,
        "base_decay_rate": 1.4,
        "co2_saved_g": 700.0,
        "money_saved": 45.0,
    },
    {
        "class_name": "salad_box",
        "display_name": "Salad Box",
        "protein": 8.0,
        "carbs": 18.0,
        "lipids": 10.0,
        "base_decay_rate": 1.8,
        "co2_saved_g": 600.0,
        "money_saved": 55.0,
    },
    {
        "class_name": "pasta_box",
        "display_name": "Pasta Box",
        "protein": 16.0,
        "carbs": 55.0,
        "lipids": 18.0,
        "base_decay_rate": 1.3,
        "co2_saved_g": 1100.0,
        "money_saved": 65.0,
    },
    {
        "class_name": "sushi_set",
        "display_name": "Sushi Set",
        "protein": 22.0,
        "carbs": 48.0,
        "lipids": 9.0,
        "base_decay_rate": 2.0,
        "co2_saved_g": 1300.0,
        "money_saved": 90.0,
    },
]

# --------------------------------------------------------------------------
# Nanos types: per-level upgrade costs (biomaterial) + base effect.
# --------------------------------------------------------------------------
NANOS_TYPES: list[dict[str, Any]] = [
    {
        "type": "welder_spider",
        "display_name": "Welder Spider",
        "max_level": 5,
        "base_effect": 1.0,  # unlock->animation speed multiplier baseline
        "upgrade_cost_json": {
            "2": {"protein": 40, "carbs": 10},
            "3": {"protein": 90, "carbs": 30},
            "4": {"protein": 180, "carbs": 70, "lipids": 20},
            "5": {"protein": 320, "carbs": 140, "lipids": 60},
        },
    },
    {
        "type": "suction_jelly",
        "display_name": "Suction Jelly",
        "max_level": 5,
        "base_effect": 1.0,  # spoiled-salvage efficiency baseline
        "upgrade_cost_json": {
            "2": {"lipids": 35, "carbs": 10},
            "3": {"lipids": 80, "carbs": 30},
            "4": {"lipids": 160, "protein": 40},
            "5": {"lipids": 300, "protein": 120, "carbs": 80},
        },
    },
    {
        "type": "crawler",
        "display_name": "Heavy Crawler",
        "max_level": 5,
        "base_effect": 1.0,  # batch-rescue bonus baseline
        "upgrade_cost_json": {
            "2": {"carbs": 50},
            "3": {"carbs": 120, "protein": 30},
            "4": {"carbs": 240, "protein": 80, "lipids": 30},
            "5": {"carbs": 420, "protein": 160, "lipids": 90},
        },
    },
]

# --------------------------------------------------------------------------
# Global tunable coefficients (economy_config key -> value + description).
# --------------------------------------------------------------------------
ECONOMY_CONFIG: list[dict[str, Any]] = [
    {
        "key": "decay_temp_k",
        "value_json": 0.08,
        "description": "k in F_temp = exp(k*(temp-25)) above 25C",
    },
    {
        "key": "decay_temp_threshold_c",
        "value_json": 25.0,
        "description": "Temperature above which decay grows exponentially",
    },
    {
        "key": "decay_humidity_ref",
        "value_json": 60.0,
        "description": "Reference humidity %; F_humidity scales around this",
    },
    {
        "key": "decay_humidity_coeff",
        "value_json": 0.01,
        "description": "Per-%RH multiplier delta for F_humidity",
    },
    {
        "key": "spoil_health_threshold",
        "value_json": 20.0,
        "description": "Below this health a food is marked spoiled (biotoxin)",
    },
    {
        "key": "decay_tick_minutes",
        "value_json": 5,
        "description": "How often the decay scheduler updates food health",
    },
    {"key": "xp_per_protein", "value_json": 1.0, "description": "XP weight per protein unit"},
    {"key": "xp_per_carbs", "value_json": 0.5, "description": "XP weight per carbs unit"},
    {"key": "xp_per_lipids", "value_json": 1.5, "description": "XP weight per lipids unit"},
    {
        "key": "level_xp_base",
        "value_json": 100,
        "description": "XP needed for level 2; grows by level_xp_growth",
    },
    {
        "key": "level_xp_growth",
        "value_json": 1.5,
        "description": "Multiplicative XP curve per level",
    },
    {
        "key": "spoiled_salvage_penalty",
        "value_json": 0.5,
        "description": "Gains multiplier when salvaging spoiled food with low-level nanos",
    },
    {
        "key": "suction_jelly_clean_level",
        "value_json": 3,
        "description": "suction_jelly level that salvages spoiled food losslessly + bonus XP",
    },
    {
        "key": "spoiled_bonus_xp",
        "value_json": 25,
        "description": "Bonus XP for lossless spoiled salvage",
    },
    {
        "key": "entropy_glitch_max",
        "value_json": 500.0,
        "description": "total_entropy mapped to glitch intensity 1.0 (normalization ceiling)",
    },
    {
        "key": "default_pkg_factor",
        "value_json": 1.0,
        "description": "F_pkg default when a food has no packaging modifier",
    },
    {
        "key": "purity_prompt_delay_hours",
        "value_json": 2,
        "description": "Hours after claim before purity (fleet-learning) prompt fires",
    },
    {
        "key": "rate_limit_swipes_per_min",
        "value_json": 4,
        "description": "Anti-abuse: max card swipes per minute before flagging",
    },
]
