"""Production entry point — runs migrations then starts uvicorn.

Usage: python -m farm_copilot.api.production
Docker CMD: ["python", "-m", "farm_copilot.api.production"]
"""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
import sys

import uvicorn

from farm_copilot.api.logging_config import setup_logging

logger = logging.getLogger(__name__)


def _run_alembic(*args: str) -> None:
    """Run an alembic subcommand, exiting the process on failure."""
    result = subprocess.run(
        ["python", "-m", "alembic", *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        logger.error("alembic %s failed: %s", " ".join(args), result.stderr)
        sys.exit(1)
    logger.info("alembic %s: %s", " ".join(args), result.stdout.strip())


def run_migrations() -> None:
    """Bootstrap a fresh database if needed, then apply Alembic migrations."""
    from farm_copilot.database.bootstrap import (
        ACTION_CREATED,
        ACTION_STAMP,
        bootstrap_database,
    )

    logger.info("Preparing database...")
    action = asyncio.run(bootstrap_database())

    if action in (ACTION_CREATED, ACTION_STAMP):
        # Schema is already at the current model state — record it as head.
        _run_alembic("stamp", "head")
    else:
        _run_alembic("upgrade", "head")
    logger.info("Database ready (action: %s)", action)


async def seed_catalog_if_empty() -> None:
    """Seed the product catalog on first startup if no products exist."""
    from farm_copilot.database.canonical_products import list_canonical_products
    from farm_copilot.database.seed_catalog import seed_product_catalog
    from farm_copilot.database.session import async_session

    async with async_session() as session, session.begin():
        products = await list_canonical_products(
            session, active_only=False
        )
        if not products:
            logger.info(
                "Empty catalog detected — seeding default products"
            )
            result = await seed_product_catalog(session)
            logger.info("Seed result: %s", result)
        else:
            logger.info(
                "Catalog already has %d products — skipping seed",
                len(products),
            )


async def run_seeds() -> None:
    """Seed catalog and the demo account within a single event loop."""
    from farm_copilot.database.seed_demo import seed_demo_account

    await seed_catalog_if_empty()
    await seed_demo_account()


def main() -> None:
    """Start production server with auto-migrations."""
    setup_logging()
    run_migrations()
    asyncio.run(run_seeds())

    # The bootstrap/seed steps above ran inside temporary event loops
    # (asyncio.run), which left asyncpg connections in the shared engine pool
    # bound to loops that are now closed. Reusing them from uvicorn's event loop
    # raises "another operation is in progress". Abandon the stale connections
    # (close=False avoids cross-loop I/O) so uvicorn starts with a fresh pool.
    from farm_copilot.database.session import engine

    engine.sync_engine.dispose(close=False)

    # Render (and most PaaS) inject the listening port via $PORT. Fall back to
    # 8000 for local/Docker runs that don't set it.
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(
        "farm_copilot.api.app:app",
        host="0.0.0.0",  # noqa: S104
        port=port,
        workers=1,  # Single worker — scheduler runs in-process
        log_level="info",
        access_log=True,
    )


if __name__ == "__main__":
    main()

