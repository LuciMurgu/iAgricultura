"""Invoice duplicate candidate query helper."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Invoice


async def list_invoice_duplicate_candidates(
    session: AsyncSession,
    *,
    farm_id: UUID,
    exclude_invoice_id: UUID,
) -> list[Invoice]:
    """List all invoices for a farm EXCEPT the given invoice.

    Used as candidates for duplicate suspicion comparison.
    """
    result = await session.execute(
        select(Invoice).where(
            Invoice.farm_id == farm_id,
            Invoice.id != exclude_invoice_id,
        )
    )
    return list(result.scalars().all())
