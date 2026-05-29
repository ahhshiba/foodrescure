"""FastAPI application entrypoint.

M1 scope: app skeleton + /health. The MQTT bridge, WebSocket manager, engines,
scheduler and REST routers are wired in over M2-M4 inside the lifespan.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
log = logging.getLogger("glitch")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("Glitch Salvage API starting (env=%s)", settings.app_env)
    # M2+: start MQTT bridge, scheduler, WS heartbeat here.
    yield
    log.info("Glitch Salvage API shutting down")


app = FastAPI(
    title="Glitch Salvage API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "glitch-salvage-api"}


# Routers are registered in M4:
# from app.api import auth, cards, nodes, inventory, bounties, feedback, stats
# app.include_router(auth.router, prefix="/api/v1")
# ...
