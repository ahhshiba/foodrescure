"""MQTT payload contract — §5.1 (FROZEN).

Shared verbatim by the backend bridge AND `scripts/sim_edge.py`. The external
Edge (Raspberry Pi) team implements the exact same field names. Do NOT rename
or drop fields here without a cross-team contract change.

Topic patterns (node_id is templated):
    glitch/{node_id}/auth/request    Edge  -> Server   AuthRequest
    glitch/{node_id}/lock/command    Server -> Edge    LockCommand
    glitch/{node_id}/status          Edge  -> Server   StatusReport
    glitch/{node_id}/heartbeat       Edge  -> Server   Heartbeat
    glitch/{node_id}/lwt             (LWT)             LastWill
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ---- Topic helpers (single source for topic strings) ----
TOPIC_PREFIX = "glitch"


def topic_auth_request(node_id: str) -> str:
    return f"{TOPIC_PREFIX}/{node_id}/auth/request"


def topic_lock_command(node_id: str) -> str:
    return f"{TOPIC_PREFIX}/{node_id}/lock/command"


def topic_status(node_id: str) -> str:
    return f"{TOPIC_PREFIX}/{node_id}/status"


def topic_heartbeat(node_id: str) -> str:
    return f"{TOPIC_PREFIX}/{node_id}/heartbeat"


def topic_lwt(node_id: str) -> str:
    return f"{TOPIC_PREFIX}/{node_id}/lwt"


# Wildcard subscriptions the backend listens on (Edge -> Server direction).
SUB_AUTH_REQUEST = f"{TOPIC_PREFIX}/+/auth/request"
SUB_STATUS = f"{TOPIC_PREFIX}/+/status"
SUB_HEARTBEAT = f"{TOPIC_PREFIX}/+/heartbeat"
SUB_LWT = f"{TOPIC_PREFIX}/+/lwt"


class _Strict(BaseModel):
    # Reject unknown fields so contract drift is caught loudly during parse.
    model_config = ConfigDict(extra="forbid")


class AuthRequest(_Strict):
    """glitch/{node_id}/auth/request — Edge -> Server."""

    rfid: str
    node_id: str
    ts: str  # ISO-8601


class LockCommand(_Strict):
    """glitch/{node_id}/lock/command — Server -> Edge."""

    action: Literal["unlock"] = "unlock"
    duration_s: int = 5
    txn_id: str


class StatusItem(_Strict):
    """One detected meal class from Edge inference."""

    class_: str = Field(alias="class")
    count: int
    confidence: float

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class StatusReport(_Strict):
    """glitch/{node_id}/status — Edge -> Server."""

    txn_id: str
    node_id: str
    items: list[StatusItem]
    image_ref: str | None = None  # images never traverse MQTT; default null
    ts: str


class Heartbeat(_Strict):
    """glitch/{node_id}/heartbeat — Edge -> Server."""

    node_id: str
    ts: str
    fw: str


class LastWill(_Strict):
    """glitch/{node_id}/lwt — broker-published Last Will."""

    node_id: str
    status: Literal["offline"] = "offline"
