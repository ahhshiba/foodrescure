"""WebSocket event contract — §5.3.

Every Server -> Client event is a tagged envelope: {"type": <event>, "data": {...}}.
Client -> Server messages are subscribe / ping.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


# ---- Server -> Client payloads ----
class UnlockSuccess(BaseModel):
    txn_id: str
    node_id: str


class ResourceGains(BaseModel):
    protein: float = 0.0
    carbs: float = 0.0
    lipids: float = 0.0


class ResourceCredited(BaseModel):
    txn_id: str
    gains: ResourceGains
    xp: int


class EntropyUpdate(BaseModel):
    total_entropy: float
    node_entropies: dict[str, float]


class NodeStatusUpdate(BaseModel):
    node_id: str
    status: str
    health_avg: float


class BountyNew(BaseModel):
    bounty: dict[str, Any]


class BountyCompleted(BaseModel):
    bounty_id: int


class PurityPrompt(BaseModel):
    transaction_id: int


# Event type registry — keep in sync with frontend `web/packages/contracts`.
WSEventType = Literal[
    "unlock_success",
    "resource_credited",
    "entropy_update",
    "node_status_update",
    "bounty_new",
    "bounty_completed",
    "purity_prompt",
]


class WSEnvelope(BaseModel):
    type: WSEventType
    data: dict[str, Any]


# ---- Client -> Server messages ----
class WSSubscribe(BaseModel):
    type: Literal["subscribe"]
    channels: list[str]


class WSPing(BaseModel):
    type: Literal["ping"]
