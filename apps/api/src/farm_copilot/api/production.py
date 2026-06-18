"""Production entry point — runs migrations then starts uvicorn.

Usage: python -m farm_copilot.api.production
Docker CMD: ["python", "-m", "farm_copilot.api.production"]
"""

from __future__ import annotations

import asyncio
import logging
import subprocess
import sys

import uvicorn

from farm_copilot.api.logging_config import setup_logging

logger = logging.getLogger(__name__)


def run_migrations() -> None:
    """Run Alembic migrations before starting the server."""
    logger.info("Running database migrations...")
    result = subprocess.run(
        ["python", "-m", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        logger.error("Migration failed: %s", result.stderr)
        sys.exit(1)
    logger.info("Migrations complete: %s", result.stdout.strip())


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


def main() -> None:
    """Start production server with auto-migrations."""
    setup_logging()
    run_migrations()
    asyncio.run(seed_catalog_if_empty())

    uvicorn.run(
        "farm_copilot.api.app:app",
        host="0.0.0.0",  # noqa: S104
        port=8000,
        workers=1,  # Single worker — scheduler runs in-process
        log_level="info",
        access_log=True,
    )


if __name__ == "__main__":
    main()

