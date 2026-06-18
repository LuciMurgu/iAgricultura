"""Invoice extraction query helpers — fetch + update invoice header from extraction."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Invoice, Supplier


async def get_invoice_for_extraction_by_id(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> Invoice | None:
    """Fetch invoice with extraction-relevant fields.

    Named distinctly from ``get_invoice_shell_by_id`` for pipeline step clarity.
    """
    result = await session.execute(
        select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.farm_id == farm_id,
        )
    )
    return result.scalar_one_or_none()


async def update_invoice_extraction(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
    supplier_name: str | None,
    supplier_tax_id: str | None,
    invoice_number: str | None,
    invoice_date: date | None,
    due_date: date | None,
    currency: str | None,
    subtotal_amount: Decimal | None,
    tax_amount: Decimal | None,
    total_amount: Decimal | None,
    raw_extraction_data: dict | None,  # type: ignore[type-arg]
    extraction_method: str | None,
) -> None:
    """Update invoice header fields from extraction results.

    Also creates/links supplier if ``supplier_name`` is provided.
    """
    supplier_id: UUID | None = None

    if supplier_name:
        # Find or create supplier for this farm
        supplier_result = await session.execute(
            select(Supplier).where(
                Supplier.farm_id == farm_id,
                Supplier.name == supplier_name,
            )
        )
        supplier = supplier_result.scalar_one_or_none()

        if supplier is None:
            supplier = Supplier(
                farm_id=farm_id,
                name=supplier_name,
                tax_id=supplier_tax_id,
            )
            session.add(supplier)
            await session.flush()
            await session.refresh(supplier)

        supplier_id = supplier.id

    await session.execute(
        update(Invoice)
        .where(
            Invoice.id == invoice_id,
            Invoice.farm_id == farm_id,
        )
        .values(
            supplier_id=supplier_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            due_date=due_date,
            currency=currency,
            subtotal_amount=subtotal_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            raw_extraction_data=raw_extraction_data,
            extraction_method=extraction_method,
        )
    )
    await session.flush()
