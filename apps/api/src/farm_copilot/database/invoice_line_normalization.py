"""Invoice line normalization update helper."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import InvoiceLineItem


async def update_invoice_line_item_normalization(
    session: AsyncSession,
    *,
    line_item_id: UUID,
    canonical_product_id: UUID,
    confidence: Decimal,
    method: str,
) -> None:
    """Set ``canonical_product_id``, ``normalization_confidence``,
    and ``normalization_method`` on a line item.
    """
    await session.execute(
        update(InvoiceLineItem)
        .where(InvoiceLineItem.id == line_item_id)
        .values(
            canonical_product_id=canonical_product_id,
            normalization_confidence=confidence,
            normalization_method=method,
        )
    )
    await session.flush()
