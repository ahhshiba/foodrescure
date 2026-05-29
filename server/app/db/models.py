"""SQLAlchemy 2.0 ORM models — the database half of the §5.4 contract.

This module is the single source of truth for the DB schema. Alembic
autogenerate diffs against ``Base.metadata`` defined here.

Conventions:
* All money/nutrition/coefficient values are floats; *no economy constants
  are hardcoded in logic* — tunable numbers live in `food_classes`,
  `nanos_types.upgrade_cost_json`, and `economy_config`.
* JSON columns use JSONB for queryability.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


# --------------------------------------------------------------------------
# Accounts & cards
# --------------------------------------------------------------------------
class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    level: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    xp: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Biomaterial running balance. §5.4 omits where /inventory's materials live;
    # storing the balance on the user is the minimal way to satisfy the
    # inventory + nanos-upgrade (deduct materials) requirements.
    protein: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    carbs: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")
    lipids: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")

    cards: Mapped[list[Card]] = relationship(back_populates="user")
    nanos: Mapped[list[NanosInventory]] = relationship(back_populates="user")


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    rfid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    claim_code: Mapped[str] = mapped_column(String(32))
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User | None] = relationship(back_populates="cards")


# --------------------------------------------------------------------------
# Smart-cabinet nodes
# --------------------------------------------------------------------------
class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # == MQTT node_id
    name: Mapped[str] = mapped_column(String(128))
    location: Mapped[str] = mapped_column(String(255), default="", server_default="")
    status: Mapped[str] = mapped_column(String(16), default="offline", server_default="offline")
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    tailscale_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    foods: Mapped[list[Food]] = relationship(back_populates="node")


# --------------------------------------------------------------------------
# Food: config table (classes) + instances
# --------------------------------------------------------------------------
class FoodClass(Base):
    """Config table — what each detected `class` string is worth + decays at."""

    __tablename__ = "food_classes"

    class_name: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. "porkchop_bento"
    display_name: Mapped[str] = mapped_column(String(128))
    display_name_zh: Mapped[str] = mapped_column(String(128), default="", server_default="")
    protein: Mapped[float] = mapped_column(Float, default=0.0)
    carbs: Mapped[float] = mapped_column(Float, default=0.0)
    lipids: Mapped[float] = mapped_column(Float, default=0.0)
    base_decay_rate: Mapped[float] = mapped_column(Float, default=1.0)  # R_base
    co2_saved_g: Mapped[float] = mapped_column(Float, default=0.0)
    money_saved: Mapped[float] = mapped_column(Float, default=0.0)


class Food(Base):
    """A physical meal instance sitting in a node."""

    __tablename__ = "foods"

    id: Mapped[int] = mapped_column(primary_key=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), index=True)
    food_class: Mapped[str] = mapped_column(ForeignKey("food_classes.class_name"))
    placed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    health: Mapped[float] = mapped_column(Float, default=100.0, server_default="100")
    spoiled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    pkg_factor: Mapped[float] = mapped_column(Float, default=1.0, server_default="1")  # F_pkg
    claimed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    claimed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reserved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    reserved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reserved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    node: Mapped[Node] = relationship(back_populates="foods")


# --------------------------------------------------------------------------
# Nanos: config table (types) + per-user inventory
# --------------------------------------------------------------------------
class NanosType(Base):
    """Config table — welder_spider / suction_jelly / crawler definitions."""

    __tablename__ = "nanos_types"

    type: Mapped[str] = mapped_column(String(32), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(128))
    max_level: Mapped[int] = mapped_column(Integer, default=5)
    base_effect: Mapped[float] = mapped_column(Float, default=1.0)
    # Per-level upgrade cost, e.g. {"2": {"protein": 10}, "3": {"protein": 25, "lipids": 5}}
    upgrade_cost_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class NanosInventory(Base):
    __tablename__ = "nanos_inventory"
    __table_args__ = (UniqueConstraint("user_id", "nanos_type", name="uq_user_nanos"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    nanos_type: Mapped[str] = mapped_column(ForeignKey("nanos_types.type"))
    level: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    user: Mapped[User] = relationship(back_populates="nanos")


# --------------------------------------------------------------------------
# Transactions & feedback (fleet-learning ground truth)
# --------------------------------------------------------------------------
class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    txn_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"))
    items_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    gains_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)


class Feedback(Base, TimestampMixin):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    purity_stars: Mapped[int] = mapped_column(Integer)  # 1..5


# --------------------------------------------------------------------------
# Daily bounties
# --------------------------------------------------------------------------
class Bounty(Base, TimestampMixin):
    __tablename__ = "bounties"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    spec_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    reward_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class BountyProgress(Base):
    __tablename__ = "bounty_progress"
    __table_args__ = (UniqueConstraint("bounty_id", "user_id", name="uq_bounty_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    bounty_id: Mapped[int] = mapped_column(ForeignKey("bounties.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    claimed: Mapped[bool] = mapped_column(Boolean, default=False)


# --------------------------------------------------------------------------
# Entropy time-series
# --------------------------------------------------------------------------
class EntropySnapshot(Base):
    __tablename__ = "entropy_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    total_entropy: Mapped[float] = mapped_column(Float)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


# --------------------------------------------------------------------------
# Global tunable config (key-value)
# --------------------------------------------------------------------------
class EconomyConfig(Base):
    """Key-value store for every globally tunable coefficient.

    Demo operators tweak rows here live — no redeploy, no magic numbers in code.
    """

    __tablename__ = "economy_config"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value_json: Mapped[Any] = mapped_column(JSONB)
    description: Mapped[str] = mapped_column(String(255), default="", server_default="")
