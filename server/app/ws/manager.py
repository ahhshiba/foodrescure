"""WebSocket connection manager — fan-out events to connected clients.

Connections are grouped by user_id so the bridge can target a single player
(`send_to_user`) or everyone (`broadcast`). A module-level singleton `manager`
is shared by the WS router and the MQTT bridge.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import WebSocket

log = logging.getLogger("glitch.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self._conns: dict[int, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._conns.setdefault(user_id, set()).add(ws)
        log.info("WS connected user=%s (total sockets=%d)", user_id, self._count())

    async def disconnect(self, user_id: int, ws: WebSocket) -> None:
        async with self._lock:
            sockets = self._conns.get(user_id)
            if sockets:
                sockets.discard(ws)
                if not sockets:
                    self._conns.pop(user_id, None)
        log.info("WS disconnected user=%s (total sockets=%d)", user_id, self._count())

    def _count(self) -> int:
        return sum(len(s) for s in self._conns.values())

    async def _send_many(self, sockets: list[WebSocket], message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception as exc:  # noqa: BLE001 - a dead socket must not kill the bridge
                log.warning("WS send failed, dropping socket: %s", exc)
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    for s in self._conns.values():
                        s.discard(ws)

    async def send_to_user(self, user_id: int, message: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._conns.get(user_id, set()))
        if sockets:
            await self._send_many(sockets, message)

    async def broadcast(self, message: dict[str, Any]) -> None:
        async with self._lock:
            sockets = [ws for s in self._conns.values() for ws in s]
        if sockets:
            await self._send_many(sockets, message)


manager = ConnectionManager()
