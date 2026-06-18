"""Shared test configuration and fixtures."""

from __future__ import annotations

import os

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ---------------------------------------------------------------------------
# Integration test support
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL")

requires_db = pytest.mark.skipif(
    DATABASE_URL is None,
    reason="DATABASE_URL not set — skipping integration tests",
)


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:  # type: ignore[misc]
    """Provide an async session for integration tests.

    Each test gets its own transaction that is rolled back after,
    ensuring no persistent side effects between tests.
    """
    if DATABASE_URL is None:
        pytest.skip("DATABASE_URL not set")

    engine = create_async_engine(DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session, session.begin():
        yield session
        await session.rollback()

    await engine.dispose()
