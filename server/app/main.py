"""FastAPI application entrypoint.

M2 scope: app skeleton + /health + WebSocket endpoint + MQTT bridge (started in
the lifespan). The scheduler and REST routers are wired in over M3-M4.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.bridge.mqtt_bridge import MqttBridge
from app.config import settings
from app.ws.router import router as ws_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
log = logging.getLogger("glitch")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("Glitch Salvage API starting (env=%s)", settings.app_env)
    bridge = MqttBridge()
    bridge_task = asyncio.create_task(bridge.run(), name="mqtt-bridge")
    app.state.bridge = bridge
    try:
        yield
    finally:
        log.info("Glitch Salvage API shutting down")
        await bridge.stop()
        bridge_task.cancel()
        try:
            await bridge_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Glitch Salvage API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(ws_router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "glitch-salvage-api"}


# REST routers are registered in M4:
# from app.api import auth, cards, nodes, inventory, bounties, feedback, stats
# app.include_router(auth.router, prefix="/api/v1")
