"""M1 contract tests — MQTT/WS payloads serialize per §5.1 / §5.3.

These guard the FROZEN MQTT contract shared with the external Edge team.
"""

from __future__ import annotations

import pytest
from app.schemas.mqtt import (
    AuthRequest,
    Heartbeat,
    LastWill,
    LockCommand,
    StatusItem,
    StatusReport,
    topic_auth_request,
    topic_lock_command,
)
from app.schemas.ws import ResourceCredited, ResourceGains
from pydantic import ValidationError


def test_auth_request_roundtrip() -> None:
    raw = {"rfid": "04A1B2C3", "node_id": "node-01", "ts": "2026-05-29T10:00:00Z"}
    msg = AuthRequest.model_validate(raw)
    assert msg.rfid == "04A1B2C3"
    assert msg.model_dump() == raw


def test_status_item_class_alias() -> None:
    # Edge sends the reserved word `class`; we expose it as `class_` internally
    # but must serialize back to `class`.
    item = StatusItem.model_validate({"class": "porkchop_bento", "count": 2, "confidence": 0.93})
    assert item.class_ == "porkchop_bento"
    assert item.model_dump(by_alias=True)["class"] == "porkchop_bento"


def test_status_report_roundtrip() -> None:
    raw = {
        "txn_id": "txn-123",
        "node_id": "node-01",
        "items": [{"class": "chicken_bento", "count": 1, "confidence": 0.88}],
        "image_ref": None,
        "ts": "2026-05-29T10:00:05Z",
    }
    report = StatusReport.model_validate(raw)
    assert report.items[0].count == 1
    dumped = report.model_dump(by_alias=True)
    assert dumped["items"][0]["class"] == "chicken_bento"


def test_lock_command_defaults() -> None:
    cmd = LockCommand(txn_id="txn-123")
    assert cmd.action == "unlock"
    assert cmd.duration_s == 5


def test_unknown_field_rejected() -> None:
    # Contract drift (extra field) must fail loudly.
    with pytest.raises(ValidationError):
        AuthRequest.model_validate({"rfid": "x", "node_id": "n", "ts": "t", "rogue": True})


def test_heartbeat_and_lwt() -> None:
    hb = Heartbeat(node_id="node-01", ts="2026-05-29T10:00:00Z", fw="1.0.0")
    assert hb.fw == "1.0.0"
    lwt = LastWill(node_id="node-01")
    assert lwt.status == "offline"


def test_topic_helpers() -> None:
    assert topic_auth_request("node-01") == "glitch/node-01/auth/request"
    assert topic_lock_command("node-01") == "glitch/node-01/lock/command"


def test_ws_resource_credited() -> None:
    evt = ResourceCredited(
        txn_id="txn-1", gains=ResourceGains(protein=30, carbs=45, lipids=20), xp=120
    )
    assert evt.gains.protein == 30
    assert evt.model_dump()["gains"]["carbs"] == 45
