"""Unit tests for the pure decay functions."""

from __future__ import annotations

import math

from app.engine.decay import compute_health, f_humidity, f_temp, is_spoiled


def test_f_temp_below_threshold_is_one() -> None:
    assert f_temp(20.0, 25.0, 0.08) == 1.0
    assert f_temp(25.0, 25.0, 0.08) == 1.0


def test_f_temp_grows_exponentially_above_threshold() -> None:
    assert f_temp(35.0, 25.0, 0.08) == math.exp(0.08 * 10)
    assert f_temp(35.0, 25.0, 0.08) > f_temp(30.0, 25.0, 0.08) > 1.0


def test_f_humidity() -> None:
    assert f_humidity(60.0, 60.0, 0.01) == 1.0
    assert f_humidity(80.0, 60.0, 0.01) == 1.2
    # floored, never below 0.1
    assert f_humidity(0.0, 60.0, 1.0) == 0.1


def test_compute_health_monotonic_decreasing() -> None:
    h0 = compute_health(0, 1.2, 1.0, 1.0, 1.0)
    h5 = compute_health(5, 1.2, 1.0, 1.0, 1.0)
    h10 = compute_health(10, 1.2, 1.0, 1.0, 1.0)
    assert h0 == 100.0
    assert h0 > h5 > h10


def test_compute_health_formula() -> None:
    # 100 - (1.2 * 1.0 * 1.0 * 1.0 * 10) = 88
    assert compute_health(10, 1.2, 1.0, 1.0, 1.0) == 88.0


def test_compute_health_clamps_to_zero() -> None:
    assert compute_health(1000, 2.0, 1.0, 1.0, 1.0) == 0.0


def test_compute_health_negative_age_clamped() -> None:
    assert compute_health(-5, 1.2, 1.0, 1.0, 1.0) == 100.0


def test_is_spoiled() -> None:
    assert is_spoiled(19.9, 20.0) is True
    assert is_spoiled(20.0, 20.0) is False
    assert is_spoiled(80.0, 20.0) is False
