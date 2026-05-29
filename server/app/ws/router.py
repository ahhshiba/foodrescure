"""/ws endpoint — JWT-authenticated WebSocket for the game client."""

from __future__ import annotations

import logging

import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.security import user_id_from_token
from app.ws.manager import manager

log = logging.getLogger("glitch.ws")

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(...)) -> None:
    # Authenticate BEFORE accepting the socket.
    try:
        user_id = user_id_from_token(token)
    except (jwt.PyJWTError, KeyError, ValueError):
        await websocket.close(code=1008)  # policy violation
        log.warning("WS rejected: invalid token")
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")
            if mtype == "ping":
                await websocket.send_json({"type": "pong"})
            elif mtype == "subscribe":
                # Channels are advisory in M2 (every client gets its own events);
                # ack so the client knows it is registered.
                await websocket.send_json(
                    {"type": "subscribed", "channels": msg.get("channels", [])}
                )
            # Unknown message types are ignored (forward-compatible).
    except WebSocketDisconnect:
        await manager.disconnect(user_id, websocket)
    except Exception as exc:  # noqa: BLE001 - never let one socket crash the app
        log.warning("WS error user=%s: %s", user_id, exc)
        await manager.disconnect(user_id, websocket)
