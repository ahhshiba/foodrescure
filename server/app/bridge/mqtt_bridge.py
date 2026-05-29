"""MQTT <-> DB <-> WebSocket bridge — the heart of the §4 data flow.

Responsibilities:
* Subscribe to Edge->Server topics (auth/request, status, heartbeat, lwt).
* Publish Server->Edge lock/command.
* Persist to DB and fan out WebSocket events to the player's UI.

Robustness (rule 7): the broker connection runs in a reconnect loop with
exponential backoff; a malformed message or a single handler error is logged
and skipped, never crashing the bridge.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
import time
import uuid
from collections import defaultdict, deque
from datetime import UTC, datetime

import aiomqtt
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Card, Food, Node, Transaction, User
from app.db.session import AsyncSessionLocal
from app.engine import economy, entropy
from app.schemas.mqtt import (
    SUB_AUTH_REQUEST,
    SUB_HEARTBEAT,
    SUB_LWT,
    SUB_STATUS,
    AuthRequest,
    Heartbeat,
    LastWill,
    LockCommand,
    StatusItem,
    StatusReport,
    topic_lock_command,
)
from app.schemas.ws import (
    EntropyUpdate,
    NodeStatusUpdate,
    ResourceCredited,
    ResourceGains,
    UnlockSuccess,
)
from app.ws.events import envelope
from app.ws.manager import manager

log = logging.getLogger("glitch.bridge")


class MqttBridge:
    def __init__(self) -> None:
        self._stop = asyncio.Event()
        self._client: aiomqtt.Client | None = None
        # rfid -> recent swipe timestamps (monotonic) for rate limiting
        self._swipes: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=32))

    # ---- lifecycle -------------------------------------------------------
    async def run(self) -> None:
        backoff = 1.0
        while not self._stop.is_set():
            try:
                async with aiomqtt.Client(
                    hostname=settings.mqtt_host,
                    port=settings.mqtt_port,
                    username=settings.mqtt_user,
                    password=settings.mqtt_password,
                    keepalive=settings.mqtt_keepalive,
                    identifier="glitch-backend-bridge",
                ) as client:
                    self._client = client
                    backoff = 1.0
                    for topic in (SUB_AUTH_REQUEST, SUB_STATUS, SUB_HEARTBEAT, SUB_LWT):
                        await client.subscribe(topic, qos=1)
                    log.info(
                        "MQTT bridge connected to %s:%s", settings.mqtt_host, settings.mqtt_port
                    )
                    async for message in client.messages:
                        await self._dispatch(message)
            except aiomqtt.MqttError as exc:
                self._client = None
                if self._stop.is_set():
                    break
                log.warning("MQTT connection lost (%s); reconnecting in %.0fs", exc, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30.0)
            except Exception:  # noqa: BLE001
                self._client = None
                log.exception("Unexpected bridge error; reconnecting in %.0fs", backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30.0)
        log.info("MQTT bridge stopped")

    async def stop(self) -> None:
        self._stop.set()

    # ---- dispatch --------------------------------------------------------
    async def _dispatch(self, message: aiomqtt.Message) -> None:
        topic = message.topic
        raw = message.payload
        if isinstance(raw, bytes | bytearray):
            text = bytes(raw).decode("utf-8", errors="replace")
        elif isinstance(raw, str):
            text = raw
        else:
            log.warning("Non-text payload on %s, skipping", topic)
            return
        try:
            if topic.matches(SUB_AUTH_REQUEST):
                await self._on_auth(AuthRequest.model_validate_json(text))
            elif topic.matches(SUB_STATUS):
                await self._on_status(StatusReport.model_validate_json(text))
            elif topic.matches(SUB_HEARTBEAT):
                await self._on_heartbeat(Heartbeat.model_validate_json(text))
            elif topic.matches(SUB_LWT):
                await self._on_lwt(LastWill.model_validate_json(text))
            else:
                log.debug("Ignoring message on unmatched topic %s", topic)
        except ValidationError as exc:
            log.warning("Contract-invalid message on %s, skipping: %s", topic, exc)
        except Exception:  # noqa: BLE001
            log.exception("Handler error on topic %s", topic)

    async def _publish(self, topic: str, payload: str) -> None:
        if self._client is None:
            log.error("Cannot publish to %s: no MQTT connection", topic)
            return
        await self._client.publish(topic, payload=payload, qos=1)

    # ---- rate limiting (anti-abuse, §11.8) -------------------------------
    def _rate_limited(self, rfid: str, max_per_min: float) -> bool:
        now = time.monotonic()
        window = self._swipes[rfid]
        window.append(now)
        recent = [t for t in window if now - t <= 60.0]
        return len(recent) > max_per_min

    # ---- handlers --------------------------------------------------------
    async def _on_auth(self, msg: AuthRequest) -> None:
        async with AsyncSessionLocal() as session:
            cfg = await economy.load_config(session)
            if self._rate_limited(msg.rfid, float(cfg.get("rate_limit_swipes_per_min", 4))):
                log.warning("RATE-LIMIT flagged rfid=%s node=%s", msg.rfid, msg.node_id)
                return

            card = (
                await session.execute(select(Card).where(Card.rfid == msg.rfid))
            ).scalar_one_or_none()

            if card is None:
                # First swipe of an unknown card -> create pending card + claim code (§11.4).
                code = f"{secrets.randbelow(1_000_000):06d}"
                session.add(Card(rfid=msg.rfid, claim_code=code))
                await session.commit()
                log.info(
                    "Pending card created rfid=%s claim_code=%s (awaiting /cards/claim)",
                    msg.rfid,
                    code,
                )
                return

            if card.user_id is None:
                log.info("Card rfid=%s not yet claimed (claim_code=%s)", msg.rfid, card.claim_code)
                return

            user_id = card.user_id
            txn_id = f"txn-{uuid.uuid4().hex[:16]}"
            # Persist a pending transaction so status (same txn_id) can be correlated,
            # surviving a restart between unlock and inference.
            session.add(
                Transaction(
                    txn_id=txn_id,
                    user_id=user_id,
                    node_id=msg.node_id,
                    items_json=[],
                    gains_json={},
                    xp_awarded=0,
                )
            )
            await session.commit()
            duration = int(cfg.get("lock_duration_s", 5))

        # (a) command the cabinet to unlock
        await self._publish(
            topic_lock_command(msg.node_id),
            LockCommand(action="unlock", duration_s=duration, txn_id=txn_id).model_dump_json(),
        )
        # (b) tell the player's UI -> Nanos swarm + pulse ring
        await manager.send_to_user(
            user_id, envelope("unlock_success", UnlockSuccess(txn_id=txn_id, node_id=msg.node_id))
        )
        log.info("UNLOCK node=%s user=%s txn=%s", msg.node_id, user_id, txn_id)

    async def _on_status(self, msg: StatusReport) -> None:
        async with AsyncSessionLocal() as session:
            txn = (
                await session.execute(select(Transaction).where(Transaction.txn_id == msg.txn_id))
            ).scalar_one_or_none()
            if txn is None:
                log.warning(
                    "Status for unknown txn_id=%s node=%s, skipping", msg.txn_id, msg.node_id
                )
                return

            nutrition = await economy.load_nutrition_map(session)
            cfg = await economy.load_config(session)
            result = economy.deconstruct(msg.items, nutrition, cfg)
            if result.unknown_classes:
                log.warning("Unknown food classes from edge: %s", result.unknown_classes)

            txn.items_json = [it.model_dump(by_alias=True) for it in msg.items]
            txn.gains_json = result.gains
            txn.xp_awarded = result.xp

            await self._mark_foods_claimed(session, msg.node_id, msg.items, txn.user_id)

            user = await session.get(User, txn.user_id)
            if user is not None:
                user.xp += result.xp
                user.level = economy.level_for_xp(
                    user.xp,
                    float(cfg.get("level_xp_base", 100)),
                    float(cfg.get("level_xp_growth", 1.5)),
                )
            await session.commit()
            user_id = txn.user_id

            ent = await entropy.compute_entropy(session)

        await manager.send_to_user(
            user_id,
            envelope(
                "resource_credited",
                ResourceCredited(
                    txn_id=msg.txn_id, gains=ResourceGains(**result.gains), xp=result.xp
                ),
            ),
        )
        await manager.broadcast(
            envelope(
                "entropy_update",
                EntropyUpdate(total_entropy=ent.total, node_entropies=ent.per_node),
            )
        )
        log.info(
            "CREDITED txn=%s user=%s gains=%s xp=%s", msg.txn_id, user_id, result.gains, result.xp
        )

    async def _mark_foods_claimed(
        self, session: AsyncSession, node_id: str, items: list[StatusItem], user_id: int
    ) -> None:
        """Best-effort: claim up to `count` unclaimed foods per class for entropy accuracy."""
        for item in items:
            foods = (
                (
                    await session.execute(
                        select(Food)
                        .where(
                            Food.node_id == node_id,
                            Food.food_class == item.class_,
                            Food.claimed.is_(False),
                        )
                        .limit(item.count)
                    )
                )
                .scalars()
                .all()
            )
            for food in foods:
                food.claimed = True
                food.claimed_by = user_id

    async def _on_heartbeat(self, msg: Heartbeat) -> None:
        async with AsyncSessionLocal() as session:
            node = await session.get(Node, msg.node_id)
            if node is None:
                node = Node(id=msg.node_id, name=msg.node_id)
                session.add(node)
            node.status = "online"
            node.last_heartbeat = datetime.now(UTC)
            await session.commit()
            health_avg = await self._node_health_avg(session, msg.node_id)
        await manager.broadcast(
            envelope(
                "node_status_update",
                NodeStatusUpdate(node_id=msg.node_id, status="online", health_avg=health_avg),
            )
        )

    async def _on_lwt(self, msg: LastWill) -> None:
        async with AsyncSessionLocal() as session:
            node = await session.get(Node, msg.node_id)
            if node is not None:
                node.status = "offline"
                await session.commit()
            health_avg = await self._node_health_avg(session, msg.node_id)
        log.warning("Node OFFLINE (LWT) node=%s", msg.node_id)
        await manager.broadcast(
            envelope(
                "node_status_update",
                NodeStatusUpdate(node_id=msg.node_id, status="offline", health_avg=health_avg),
            )
        )

    async def _node_health_avg(self, session: AsyncSession, node_id: str) -> float:
        foods = (
            (
                await session.execute(
                    select(Food).where(Food.node_id == node_id, Food.claimed.is_(False))
                )
            )
            .scalars()
            .all()
        )
        if not foods:
            return 0.0
        return round(sum(f.health for f in foods) / len(foods), 2)
