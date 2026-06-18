"""Canonical product query helpers."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import CanonicalProduct


async def get_canonical_product_by_id(
    session: AsyncSession,
    *,
    product_id: UUID,
) -> CanonicalProduct | None:
    """Fetch a canonical product by ID."""
    result = await session.execute(
        select(CanonicalProduct).where(CanonicalProduct.id == product_id)
    )
    return result.scalar_one_or_none()


async def list_canonical_products(
    session: AsyncSession,
    *,
    active_only: bool = True,
) -> list[CanonicalProduct]:
    """List canonical products, optionally filtered to active only."""
    stmt = select(CanonicalProduct)
    if active_only:
        stmt = stmt.where(CanonicalProduct.active.is_(True))
    result = await session.execute(stmt)
    return list(result.scalars().all())
