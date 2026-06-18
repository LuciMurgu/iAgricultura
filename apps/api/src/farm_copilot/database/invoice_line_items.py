"""Invoice line item query helpers — insert, replace, fetch."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import InvoiceLineItem


async def replace_invoice_extracted_line_items(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    line_items: list[dict],  # type: ignore[type-arg]
) -> list[InvoiceLineItem]:
    """Delete existing line items for this invoice, then insert new ones.

    Each dict in ``line_items`` should have: ``line_order``,
    ``raw_description``, ``quantity``, ``unit``, ``unit_price``,
    ``line_total``, ``tax_rate``, ``tax_amount``.

    Returns the inserted rows.
    """
    await session.execute(
        delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice_id)
    )

    rows = [
        InvoiceLineItem(invoice_id=invoice_id, **item)
        for item in line_items
    ]
    session.add_all(rows)
    await session.flush()
    for row in rows:
        await session.refresh(row)
    return rows


async def get_invoice_line_items_by_invoice_id(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> list[InvoiceLineItem]:
    """Fetch all line items for an invoice, ordered by line_order.

    Farm-scoped via the invoice relationship.
    """
    result = await session.execute(
        select(InvoiceLineItem)
        .join(InvoiceLineItem.invoice)
        .where(
            InvoiceLineItem.invoice_id == invoice_id,
        )
        .order_by(InvoiceLineItem.line_order)
    )
    return list(result.scalars().all())


async def get_invoice_line_item_by_id(
    session: AsyncSession,
    *,
    line_item_id: UUID,
) -> InvoiceLineItem | None:
    """Fetch a single line item by ID."""
    result = await session.execute(
        select(InvoiceLineItem).where(InvoiceLineItem.id == line_item_id)
    )
    return result.scalar_one_or_none()
