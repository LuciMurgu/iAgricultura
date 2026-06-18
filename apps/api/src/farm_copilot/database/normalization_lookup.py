"""Normalization lookup — join aliases to canonical products with precedence."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import CanonicalProduct, ProductAlias
from .product_aliases import _precedence_case


async def list_exact_normalization_candidates(
    session: AsyncSession,
    *,
    alias_text: str,
    farm_id: UUID,
    supplier_id: UUID | None = None,
    limit: int | None = None,
) -> list[tuple[ProductAlias, CanonicalProduct]]:
    """Find alias→product pairs for exact normalization.

    Joins ``product_aliases`` with ``canonical_products``. Uses same
    visibility and precedence rules as
    ``list_precedence_ordered_visible_aliases``.

    Returns tuples of ``(ProductAlias, CanonicalProduct)``.
    """
    precedence = _precedence_case(farm_id, supplier_id)

    stmt = (
        select(ProductAlias, CanonicalProduct)
        .join(
            CanonicalProduct,
            ProductAlias.canonical_product_id == CanonicalProduct.id,
        )
        .where(
            ProductAlias.alias_text == alias_text,
            ProductAlias.farm_id.in_([farm_id]) | ProductAlias.farm_id.is_(None),
        )
    )
    if supplier_id is not None:
        stmt = stmt.where(
            ProductAlias.supplier_id.in_([supplier_id])
            | ProductAlias.supplier_id.is_(None),
        )
    else:
        stmt = stmt.where(ProductAlias.supplier_id.is_(None))

    stmt = stmt.order_by(precedence, ProductAlias.created_at)
    if limit is not None:
        stmt = stmt.limit(limit)

    result = await session.execute(stmt)
    return list(result.tuples().all())
