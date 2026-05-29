"""REST request/response contract — §5.2.

Response models mirror the DB shape but are decoupled from ORM internals.
Endpoints land in M4; these types are defined now so frontend + backend agree.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ORM = ConfigDict(from_attributes=True)


# ---- Auth / accounts ----
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClaimCardRequest(BaseModel):
    rfid: str
    claim_code: str


# ---- Me / inventory ----
class NanosOut(BaseModel):
    model_config = ORM
    nanos_type: str
    level: int


class MeResponse(BaseModel):
    model_config = ORM
    id: int
    username: str
    level: int
    xp: int
    protein: float
    carbs: float
    lipids: float


class InventoryResponse(BaseModel):
    protein: float
    carbs: float
    lipids: float
    nanos: list[NanosOut]


class UpgradeResponse(BaseModel):
    nanos_type: str
    new_level: int
    spent: dict[str, float]


# ---- Nodes / foods ----
class FoodOut(BaseModel):
    model_config = ORM
    id: int
    food_class: str
    health: float
    spoiled: bool
    claimed: bool


class NodeOut(BaseModel):
    model_config = ORM
    id: str
    name: str
    location: str
    status: str
    last_heartbeat: datetime | None = None
    lat: float | None = None
    lng: float | None = None
    entropy: float = 0.0
    health_avg: float = 0.0


class NodeDetail(NodeOut):
    foods: list[FoodOut] = []


# ---- Bounties ----
class BountyOut(BaseModel):
    model_config = ORM
    id: int
    spec_json: dict[str, Any]
    reward_json: dict[str, Any]
    progress: float = 0.0
    completed: bool = False
    claimed: bool = False


# ---- Feedback ----
class FeedbackRequest(BaseModel):
    transaction_id: int
    purity_stars: int = Field(ge=1, le=5)


# ---- ESG / stats (UI2) ----
class EsgStats(BaseModel):
    co2_saved_g: float
    money_saved: float
    meals_rescued: int


class EntropyPoint(BaseModel):
    ts: datetime
    total_entropy: float


class EntropyStats(BaseModel):
    total_entropy: float
    series: list[EntropyPoint]


class FleetAccuracy(BaseModel):
    accuracy: float
    sample_size: int


class LeaderboardEntry(BaseModel):
    username: str
    xp: int
    level: int


class TransactionOut(BaseModel):
    model_config = ORM
    txn_id: str
    node_id: str
    items_json: list[dict[str, Any]]
    gains_json: dict[str, Any]
    xp_awarded: int
    created_at: datetime


class Page(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int


# ---- Generic error envelope ----
class ErrorResponse(BaseModel):
    detail: str
