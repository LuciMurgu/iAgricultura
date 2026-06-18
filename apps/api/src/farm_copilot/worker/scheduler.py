"""Background ANAF sync scheduler.

Uses asyncio.create_task() within FastAPI's lifespan to run periodic
ANAF sync for all connected farms. No external dependencies needed.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class SchedulerSettings(BaseSettings):
    """Scheduler configuration from environment."""

    anaf_sync_enabled: bool = True
    anaf_sync_interval_seconds: int = 14400  # 4 hours default
    anaf_sync_initial_delay_seconds: int = 60  # 1 min after startup

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


scheduler_settings = SchedulerSettings()


async def _sync_all_farms() -> None:
    """Run ANAF sync for every farm with an active token.

    Per-farm error isolation: if one farm fails, others continue.
    Uses its own DB session (not request-scoped).
    """
    from farm_copilot.database.anaf_tokens import (
        list_all_active_tokens,
    )
    from farm_copilot.database.session import async_session
    from farm_copilot.worker.anaf_client import AnafClient
    from farm_copilot.worker.anaf_sync import run_anaf_sync

    logger.info("Scheduled ANAF sync starting")
    synced = 0
    failed = 0

    async with async_session() as session:
        tokens = await list_all_active_tokens(session)

    if not tokens:
        logger.info(
            "No farms with active ANAF tokens — skipping sync"
        )
        return

    client = AnafClient()
    try:
        for token in tokens:
            farm_id = token.farm_id
            try:
                async with async_session() as session, session.begin():
                        result = await run_anaf_sync(
                            session,
                            farm_id=farm_id,
                            anaf_client=client,
                        )
                synced += 1
                logger.info(
                    "ANAF sync completed for farm %s: "
                    "%d invoices, %d skipped, %d errors",
                    farm_id,
                    result.invoices_created,
                    result.skipped_duplicates,
                    result.errors,
                )
            except Exception:
                failed += 1
                logger.exception(
                    "ANAF sync failed for farm %s", farm_id
                )
    finally:
        await client.close()

    logger.info(
        "Scheduled ANAF sync finished: %d farms synced, %d failed",
        synced,
        failed,
    )


async def _scheduler_loop() -> None:
    """Main scheduler loop. Runs indefinitely until cancelled."""
    settings = scheduler_settings

    if not settings.anaf_sync_enabled:
        logger.info(
            "ANAF auto-sync is disabled (ANAF_SYNC_ENABLED=false)"
        )
        return

    logger.info(
        "ANAF auto-sync scheduler started "
        "(interval=%ds, initial_delay=%ds)",
        settings.anaf_sync_interval_seconds,
        settings.anaf_sync_initial_delay_seconds,
    )

    # Wait before first run (let the server finish starting)
    await asyncio.sleep(settings.anaf_sync_initial_delay_seconds)

    while True:
        try:
            await _sync_all_farms()
        except Exception:
            logger.exception("Unhandled error in scheduler loop")

        await asyncio.sleep(settings.anaf_sync_interval_seconds)


# Module-level task reference to prevent garbage collection
_scheduler_task: asyncio.Task[None] | None = None


def start_scheduler() -> None:
    """Start the background scheduler task.

    Call from FastAPI lifespan startup.
    """
    global _scheduler_task  # noqa: PLW0603
    _scheduler_task = asyncio.create_task(_scheduler_loop())
    logger.info("Scheduler task created")


async def stop_scheduler() -> None:
    """Cancel the background scheduler task.

    Call from FastAPI lifespan shutdown.
    """
    global _scheduler_task  # noqa: PLW0603
    if _scheduler_task is not None:
        _scheduler_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _scheduler_task
        _scheduler_task = None
        logger.info("Scheduler task stopped")
