"""ws_listen.py — dev tool that connects to /ws and prints events.

Used to verify the bridge's WebSocket fan-out during M2.

Inside the stack (reaches the running `api` service over the compose network):
    docker compose run --rm api python scripts/ws_listen.py --user-id 1

From the Windows host:
    python scripts/ws_listen.py --url ws://localhost:8000/ws --token "<JWT>"
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import websockets  # noqa: E402
from app.security import create_access_token  # noqa: E402

log = logging.getLogger("ws_listen")


async def main() -> None:
    ap = argparse.ArgumentParser(description="Listen to Glitch Salvage WS events")
    ap.add_argument("--url", default="ws://api:8000/ws", help="base ws url (no token)")
    ap.add_argument("--token", default=None, help="JWT; if omitted, minted from --user-id")
    ap.add_argument("--user-id", type=int, default=None, help="mint a JWT for this user id")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s :: %(message)s")

    token = args.token
    if token is None:
        if args.user_id is None:
            ap.error("provide --token or --user-id")
        token = create_access_token(args.user_id)

    uri = f"{args.url}?token={token}"
    log.info("Connecting to %s", args.url)
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"type": "subscribe", "channels": ["all"]}))
        log.info("Connected. Waiting for events (Ctrl+C to quit)...")
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                log.info("RAW %s", raw)
                continue
            log.info(
                "EVENT %s :: %s",
                msg.get("type"),
                json.dumps(msg.get("data", {}), ensure_ascii=False),
            )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
