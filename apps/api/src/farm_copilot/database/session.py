"""Async database session factory — shared engine, no pool-per-request.

One ``AsyncEngine`` and one ``async_sessionmaker`` are created at module level
and reused across the entire server lifetime.  FastAPI route handlers obtain
sessions via the ``get_db`` dependency.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


class DatabaseSettings(BaseSettings):
    """Load ``DATABASE_URL`` from the environment (or ``.env`` file)."""

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/farm_copilot"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


_settings = DatabaseSettings()

engine: AsyncEngine = create_async_engine(
    _settings.database_url,
    pool_size=5,
    max_overflow=10,
)

async_session: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


def get_engine() -> AsyncEngine:
    """Return the shared engine — used by Alembic and startup/shutdown hooks."""
    return engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an ``AsyncSession`` per request."""
    async with async_session() as session:
        yield session
