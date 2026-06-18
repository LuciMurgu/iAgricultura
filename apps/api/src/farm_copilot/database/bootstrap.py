"""Database bootstrap for fresh deploys.

On a brand-new database (for example a fresh Supabase project) the Alembic
migration chain cannot run from zero: the initial revision only ``ALTER``s
tables that an earlier ``create_all()`` was expected to have produced. Running
``alembic upgrade head`` against an empty database therefore fails on the first
foreign key.

This module makes a fresh deploy reliable:

1. Ensure required Postgres extensions exist (``pgcrypto`` for
   ``gen_random_uuid()``, ``vector`` for product embeddings).
2. Detect whether the database is empty.
3. If empty, create the full current schema directly from the SQLAlchemy
   models, so the caller can ``alembic stamp head`` and treat all future
   migrations as incremental.

The engine is disposed before returning so the next ``asyncio.run`` (e.g. the
catalog/demo seeding step) starts with a clean connection pool.
"""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text

from farm_copilot.database.models import Base
from farm_copilot.database.session import engine

logger = logging.getLogger(__name__)

# pgcrypto: gen_random_uuid() defaults. vector: product_embeddings column.
REQUIRED_EXTENSIONS = ("pgcrypto", "vector")

# What the caller should do with Alembic after bootstrap.
ACTION_CREATED = "created"  # fresh DB: schema built from models -> stamp head
ACTION_STAMP = "stamp"  # schema exists but no Alembic history -> stamp head
ACTION_UPGRADE = "upgrade"  # normal incremental -> upgrade head


def _has_table(sync_conn: object, name: str) -> bool:
    return inspect(sync_conn).has_table(name)


async def bootstrap_database() -> str:
    """Prepare the database and return the Alembic action the caller should run.

    Returns one of ACTION_CREATED, ACTION_STAMP, or ACTION_UPGRADE.
    """
    # 1. Extensions (idempotent).
    async with engine.begin() as conn:
        for ext in REQUIRED_EXTENSIONS:
            await conn.execute(text(f'CREATE EXTENSION IF NOT EXISTS "{ext}"'))

    # 2. Inspect current state.
    async with engine.connect() as conn:
        has_core = await conn.run_sync(_has_table, "farms")
        has_version = await conn.run_sync(_has_table, "alembic_version")

    # 3. Decide and act.
    if not has_core:
        logger.info("Fresh database detected — creating schema from models")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        action = ACTION_CREATED
    elif not has_version:
        logger.info("Existing schema without Alembic history — will stamp head")
        action = ACTION_STAMP
    else:
        action = ACTION_UPGRADE

    await engine.dispose()
    return action
