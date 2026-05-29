"""APScheduler jobs — decay, entropy snapshots, daily bounties, purity prompts.

Runs inside the API process (AsyncIOScheduler on the FastAPI event loop), so no
external cron is needed. Started/stopped from the app lifespan.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db.models import EntropySnapshot, Feedback, Transaction
from app.db.session import AsyncSessionLocal
from app.engine import bounties, decay, economy, entropy
from app.schemas.ws import BountyNew, EntropyUpdate, PurityPrompt
from app.ws.events import envelope
from app.ws.manager import manager

log = logging.getLogger("glitch.scheduler")


def _today() -> date:
    return datetime.now(UTC).date()


class GlitchScheduler:
    def __init__(self) -> None:
        self._sched = AsyncIOScheduler(timezone="UTC")
        self._prompted: set[int] = set()

    async def start(self) -> None:
        async with AsyncSessionLocal() as session:
            cfg = await economy.load_config(session)

        decay_min = max(1, int(cfg.get("decay_tick_minutes", 5)))
        entropy_min = max(1, int(cfg.get("entropy_snapshot_minutes", 1)))
        purity_min = max(1, int(cfg.get("purity_prompt_tick_minutes", 1)))

        self._sched.add_job(
            self.decay_job,
            "interval",
            minutes=decay_min,
            id="decay",
            coalesce=True,
            max_instances=1,
        )
        self._sched.add_job(
            self.entropy_job,
            "interval",
            minutes=entropy_min,
            id="entropy",
            coalesce=True,
            max_instances=1,
        )
        self._sched.add_job(
            self.purity_job,
            "interval",
            minutes=purity_min,
            id="purity",
            coalesce=True,
            max_instances=1,
        )
        # Generate the day's bounties just after midnight (and once at startup below).
        self._sched.add_job(
            self.bounty_job, "cron", hour=0, minute=5, id="bounties", coalesce=True, max_instances=1
        )

        self._sched.start()
        log.info(
            "Scheduler started (decay=%dm entropy=%dm purity=%dm)",
            decay_min,
            entropy_min,
            purity_min,
        )

        # Prime state immediately so the demo has data right away.
        await self.bounty_job()
        await self.decay_job()
        await self.entropy_job()

    async def shutdown(self) -> None:
        if self._sched.running:
            self._sched.shutdown(wait=False)
            log.info("Scheduler stopped")

    # ---- jobs ------------------------------------------------------------
    async def decay_job(self) -> None:
        try:
            async with AsyncSessionLocal() as session:
                cfg = await economy.load_config(session)
                result = await decay.run_decay_tick(session, cfg)
            if result.updated:
                log.info(
                    "Decay tick: %d foods updated, %d newly spoiled",
                    result.updated,
                    result.newly_spoiled,
                )
        except Exception:  # noqa: BLE001
            log.exception("decay_job failed")

    async def entropy_job(self) -> None:
        try:
            async with AsyncSessionLocal() as session:
                ent = await entropy.compute_entropy(session)
                session.add(
                    EntropySnapshot(
                        total_entropy=ent.total, payload_json={"per_node": ent.per_node}
                    )
                )
                await session.commit()
            await manager.broadcast(
                envelope(
                    "entropy_update",
                    EntropyUpdate(total_entropy=ent.total, node_entropies=ent.per_node),
                )
            )
        except Exception:  # noqa: BLE001
            log.exception("entropy_job failed")

    async def bounty_job(self) -> None:
        try:
            async with AsyncSessionLocal() as session:
                cfg = await economy.load_config(session)
                templates = cfg.get("bounty_templates", [])
                result = await bounties.generate_daily_bounties(session, templates, _today())
                created = [
                    {"id": b.id, "spec_json": b.spec_json, "reward_json": b.reward_json}
                    for b in result.created
                ]
            if result.skipped:
                log.debug("Bounties already exist for %s", _today())
            else:
                log.info("Generated %d daily bounties for %s", len(created), _today())
                for b in created:
                    await manager.broadcast(envelope("bounty_new", BountyNew(bounty=b)))
        except Exception:  # noqa: BLE001
            log.exception("bounty_job failed")

    async def purity_job(self) -> None:
        """Fleet learning: prompt for a purity rating ~delay hours after claim."""
        try:
            async with AsyncSessionLocal() as session:
                cfg = await economy.load_config(session)
                delay_h = float(cfg.get("purity_prompt_delay_hours", 2))
                now = datetime.now(UTC)
                cutoff = now - timedelta(hours=delay_h)
                lower = cutoff - timedelta(hours=max(delay_h, 1.0))

                txns = (
                    (
                        await session.execute(
                            select(Transaction).where(
                                Transaction.xp_awarded > 0,
                                Transaction.created_at <= cutoff,
                                Transaction.created_at >= lower,
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                fed_back = set(
                    (await session.execute(select(Feedback.transaction_id))).scalars().all()
                )

                to_prompt = [t for t in txns if t.id not in self._prompted and t.id not in fed_back]

            for txn in to_prompt:
                self._prompted.add(txn.id)
                await manager.send_to_user(
                    txn.user_id, envelope("purity_prompt", PurityPrompt(transaction_id=txn.id))
                )
                log.info("Purity prompt sent txn=%s user=%s", txn.id, txn.user_id)
        except Exception:  # noqa: BLE001
            log.exception("purity_job failed")
