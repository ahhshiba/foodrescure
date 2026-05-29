"""FastAPI application entrypoint.

M2 scope: app skeleton + /health + WebSocket endpoint + MQTT bridge (started in
the lifespan). The scheduler and REST routers are wired in over M3-M4.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import account, auth, bounties, feedback, nodes, salvage, stats, tailscale
from app.bridge.mqtt_bridge import MqttBridge
from app.config import settings
from app.scheduler import GlitchScheduler
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

    scheduler = GlitchScheduler()
    await scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        log.info("Glitch Salvage API shutting down")
        await scheduler.shutdown()
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
app.include_router(tailscale.router)

# Backwards compatibility for Pi which hardcodes /nodes/{node_id}/pickup_result
pi_router = APIRouter(tags=["pi_compat"])
@pi_router.post("/nodes/{node_id}/pickup_result")
async def pickup_result_compat(node_id: str, payload: nodes.PiResult, session: AsyncSession = Depends(account.get_session)):
    return await nodes.pickup_result(node_id, payload, session)
app.include_router(pi_router)

_API = "/api/v1"
app.include_router(auth.router, prefix=_API)
app.include_router(account.router, prefix=_API)
app.include_router(nodes.router, prefix=_API)
app.include_router(salvage.router, prefix=_API)
app.include_router(bounties.router, prefix=_API)
app.include_router(feedback.router, prefix=_API)
app.include_router(stats.router, prefix=_API)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "glitch-salvage-api"}
