"""Invoice line classification update helper."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import InvoiceLineItem


async def update_invoice_line_item_classification(
    session: AsyncSession,
    *,
    line_item_id: UUID,
    classification: str,
) -> None:
    """Set the ``line_classification`` field on a line item."""
    await session.execute(
        update(InvoiceLineItem)
        .where(InvoiceLineItem.id == line_item_id)
        .values(line_classification=classification)
    )
    await session.flush()
