"""sim_edge.py — simulated external Raspberry Pi smart cabinet.

Drives the full §4 data flow against the broker WITHOUT physical hardware:
  * connects with a Last Will (offline) message
  * publishes periodic heartbeats
  * publishes auth/request (a simulated card swipe)
  * subscribes to lock/command and, on unlock, replies with a status report
    after a short delay (simulating relay + camera inference)

Uses the FROZEN contract in app.schemas.mqtt — the same definitions the backend
consumes — so this stays in lockstep with the real Edge.

Run inside the stack (broker host defaults to the compose service name):
    docker compose run --rm api python scripts/sim_edge.py --swipe

From the Windows host (broker on localhost):
    python scripts/sim_edge.py --host localhost --swipe
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import random
import sys
from datetime import UTC, datetime
from pathlib import Path

# Make the `app` package importable when run as a bare script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import aiomqtt  # noqa: E402
from app.config import settings  # noqa: E402
from app.schemas.mqtt import (  # noqa: E402
    AuthRequest,
    Heartbeat,
    LastWill,
    LockCommand,
    StatusItem,
    StatusReport,
    topic_auth_request,
    topic_heartbeat,
    topic_lock_command,
    topic_lwt,
    topic_status,
)

log = logging.getLogger("sim_edge")


def _now() -> str:
    return datetime.now(UTC).isoformat()


def parse_items(spec: str) -> list[StatusItem]:
    """'porkchop_bento:2,chicken_bento:1' -> [StatusItem, ...]"""
    items: list[StatusItem] = []
    for chunk in spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        name, _, count = chunk.partition(":")
        items.append(
            StatusItem.model_validate(
                {
                    "class": name.strip(),
                    "count": int(count or 1),
                    "confidence": round(random.uniform(0.82, 0.99), 2),
                }
            )
        )
    return items


async def heartbeat_loop(client: aiomqtt.Client, node_id: str, interval: float, fw: str) -> None:
    while True:
        hb = Heartbeat(node_id=node_id, ts=_now(), fw=fw)
        await client.publish(topic_heartbeat(node_id), hb.model_dump_json(), qos=1)
        log.info("heartbeat -> %s", node_id)
        await asyncio.sleep(interval)


async def swipe_loop(
    client: aiomqtt.Client, node_id: str, rfid: str, count: int, interval: float
) -> None:
    for i in range(count):
        await asyncio.sleep(0.5 if i == 0 else interval)
        req = AuthRequest(rfid=rfid, node_id=node_id, ts=_now())
        await client.publish(topic_auth_request(node_id), req.model_dump_json(), qos=1)
        log.info("SWIPE %d/%d rfid=%s -> %s", i + 1, count, rfid, node_id)


async def main() -> None:
    ap = argparse.ArgumentParser(description="Simulated Glitch Salvage Edge node")
    ap.add_argument(
        "--host",
        default=settings.mqtt_host,
        help="broker host (use 'localhost' from the host machine)",
    )
    ap.add_argument("--port", type=int, default=settings.mqtt_port)
    ap.add_argument("--user", default=settings.mqtt_user)
    ap.add_argument("--password", default=settings.mqtt_password)
    ap.add_argument("--node-id", default="node-01")
    ap.add_argument("--rfid", default="04DEADBEEF")
    ap.add_argument("--fw", default="sim-1.0.0")
    ap.add_argument("--items", default="porkchop_bento:2,chicken_bento:1", help="class:count,...")
    ap.add_argument("--heartbeat-interval", type=float, default=15.0)
    ap.add_argument("--status-delay", type=float, default=2.0, help="seconds from unlock -> status")
    ap.add_argument("--swipe", action="store_true", help="send a card swipe on startup")
    ap.add_argument("--swipes", type=int, default=1, help="number of swipes to send")
    ap.add_argument("--swipe-interval", type=float, default=8.0)
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s"
    )
    items = parse_items(args.items)
    node_id = args.node_id

    will = aiomqtt.Will(
        topic=topic_lwt(node_id),
        payload=LastWill(node_id=node_id).model_dump_json(),
        qos=1,
        retain=False,
    )

    async with aiomqtt.Client(
        hostname=args.host,
        port=args.port,
        username=args.user,
        password=args.password,
        will=will,
        identifier=f"sim-edge-{node_id}",
    ) as client:
        log.info("Connected to %s:%s as node %s", args.host, args.port, node_id)
        await client.subscribe(topic_lock_command(node_id), qos=1)

        tasks = [
            asyncio.create_task(heartbeat_loop(client, node_id, args.heartbeat_interval, args.fw))
        ]
        if args.swipe:
            tasks.append(
                asyncio.create_task(
                    swipe_loop(client, node_id, args.rfid, args.swipes, args.swipe_interval)
                )
            )

        try:
            async for message in client.messages:
                if message.topic.matches(topic_lock_command(node_id)):
                    payload = message.payload
                    if isinstance(payload, bytes | bytearray):
                        payload = payload.decode()
                    cmd = LockCommand.model_validate_json(payload)
                    log.info(
                        "UNLOCK received txn=%s duration=%ss -> dispensing",
                        cmd.txn_id,
                        cmd.duration_s,
                    )
                    await asyncio.sleep(args.status_delay)
                    report = StatusReport(
                        txn_id=cmd.txn_id, node_id=node_id, items=items, image_ref=None, ts=_now()
                    )
                    await client.publish(
                        topic_status(node_id), report.model_dump_json(by_alias=True), qos=1
                    )
                    log.info("STATUS sent txn=%s items=%s", cmd.txn_id, args.items)
        finally:
            for t in tasks:
                t.cancel()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
