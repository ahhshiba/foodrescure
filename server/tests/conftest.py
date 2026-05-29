"""Test bootstrap.

Set APP_ENV=test BEFORE any app module imports so the async engine uses a
NullPool — pytest-asyncio runs each test in its own event loop, and a pooled
asyncpg connection bound to a previous loop raises "attached to a different
loop". NullPool opens a fresh connection per checkout, sidestepping this.
"""

from __future__ import annotations

import os

os.environ["APP_ENV"] = "test"
