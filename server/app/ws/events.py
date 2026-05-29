"""Typed helpers that build §5.3 WS envelopes: {"type": ..., "data": {...}}."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.schemas.ws import WSEventType


def envelope(event_type: WSEventType, data: BaseModel | dict[str, Any]) -> dict[str, Any]:
    payload = data.model_dump() if isinstance(data, BaseModel) else data
    return {"type": event_type, "data": payload}
