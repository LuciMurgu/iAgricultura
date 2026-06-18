"""Invoice status update helper."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Invoice


async def update_invoice_status(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
    status: str,
) -> None:
    """Update the status field on an invoice. Farm-scoped."""
    await session.execute(
        update(Invoice)
        .where(
            Invoice.id == invoice_id,
            Invoice.farm_id == farm_id,
        )
        .values(status=status)
    )
    await session.flush()
