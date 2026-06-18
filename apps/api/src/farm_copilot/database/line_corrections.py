"""Line correction query helpers — insert + list."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Invoice, LineCorrection


async def insert_line_correction(
    session: AsyncSession,
    *,
    farm_id: UUID,
    invoice_id: UUID,
    invoice_line_item_id: UUID,
    correction_kind: str,
    previous_canonical_product_id: UUID | None,
    new_canonical_product_id: UUID,
    previous_normalization_method: str | None = None,
    previous_normalization_confidence: Decimal | None = None,
    previous_raw_description: str | None = None,
    actor: str | None = None,
    reason: str | None = None,
) -> LineCorrection | None:
    """Insert a line correction.

    Verifies invoice belongs to farm first. Returns ``None`` if invoice
    not found for farm.
    """
    # Verify invoice belongs to farm
    invoice_result = await session.execute(
        select(Invoice.id).where(
            Invoice.id == invoice_id,
            Invoice.farm_id == farm_id,
        )
    )
    if invoice_result.scalar_one_or_none() is None:
        return None

    correction = LineCorrection(
        farm_id=farm_id,
        invoice_id=invoice_id,
        invoice_line_item_id=invoice_line_item_id,
        correction_kind=correction_kind,
        previous_canonical_product_id=previous_canonical_product_id,
        new_canonical_product_id=new_canonical_product_id,
        previous_normalization_method=previous_normalization_method,
        previous_normalization_confidence=previous_normalization_confidence,
        previous_raw_description=previous_raw_description,
        actor=actor,
        reason=reason,
    )
    session.add(correction)
    await session.flush()
    await session.refresh(correction)
    return correction


async def list_line_corrections_by_line_item_id(
    session: AsyncSession,
    *,
    farm_id: UUID,
    invoice_line_item_id: UUID,
) -> list[LineCorrection]:
    """List all corrections for a line item, most recent first."""
    result = await session.execute(
        select(LineCorrection).where(
            LineCorrection.farm_id == farm_id,
            LineCorrection.invoice_line_item_id == invoice_line_item_id,
        ).order_by(LineCorrection.created_at.desc())
    )
    return list(result.scalars().all())
