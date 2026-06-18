"""Benchmark observation query helpers — insert, batch insert, list."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import BenchmarkObservation


async def insert_benchmark_observation(
    session: AsyncSession,
    *,
    farm_id: UUID,
    canonical_product_id: UUID,
    source_kind: str,
    observed_at: datetime,
    normalized_unit: str,
    normalized_unit_price: Decimal,
    invoice_id: UUID | None = None,
    invoice_line_item_id: UUID | None = None,
    region_county: str | None = None,
    region_name: str | None = None,
    currency: str = "RON",
    ex_vat: bool | None = None,
    freight_separated: bool | None = None,
    source_notes: str | None = None,
) -> BenchmarkObservation:
    """Insert a single benchmark observation. Returns the created row."""
    obs = BenchmarkObservation(
        farm_id=farm_id,
        canonical_product_id=canonical_product_id,
        source_kind=source_kind,
        observed_at=observed_at,
        normalized_unit=normalized_unit,
        normalized_unit_price=normalized_unit_price,
        invoice_id=invoice_id,
        invoice_line_item_id=invoice_line_item_id,
        region_county=region_county,
        region_name=region_name,
        currency=currency,
        ex_vat=ex_vat,
        freight_separated=freight_separated,
        source_notes=source_notes,
    )
    session.add(obs)
    await session.flush()
    await session.refresh(obs)
    return obs


async def insert_benchmark_observations_batch(
    session: AsyncSession,
    *,
    observations: list[dict],  # type: ignore[type-arg]
) -> list[BenchmarkObservation]:
    """Batch insert benchmark observations. Returns all created rows."""
    rows = [BenchmarkObservation(**obs) for obs in observations]
    session.add_all(rows)
    await session.flush()
    for row in rows:
        await session.refresh(row)
    return rows


async def list_benchmark_observations(
    session: AsyncSession,
    *,
    farm_id: UUID,
    canonical_product_id: UUID,
    normalized_unit: str,
    observed_at_from: datetime | None = None,
    observed_at_to: datetime | None = None,
    source_kinds: list[str] | None = None,
    limit: int | None = None,
) -> list[BenchmarkObservation]:
    """List observations filtered by product, unit, optional time window
    and source kinds. Ordered by observed_at ascending.
    """
    stmt = select(BenchmarkObservation).where(
        BenchmarkObservation.farm_id == farm_id,
        BenchmarkObservation.canonical_product_id == canonical_product_id,
        BenchmarkObservation.normalized_unit == normalized_unit,
    )
    if observed_at_from is not None:
        stmt = stmt.where(BenchmarkObservation.observed_at >= observed_at_from)
    if observed_at_to is not None:
        stmt = stmt.where(BenchmarkObservation.observed_at <= observed_at_to)
    if source_kinds is not None:
        stmt = stmt.where(BenchmarkObservation.source_kind.in_(source_kinds))
    stmt = stmt.order_by(BenchmarkObservation.observed_at)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def list_benchmark_observations_by_provenance(
    session: AsyncSession,
    *,
    farm_id: UUID,
    invoice_id: UUID | None = None,
    invoice_line_item_id: UUID | None = None,
) -> list[BenchmarkObservation]:
    """List observations by invoice/line provenance.

    If ``line_item_id`` is provided, filter by that. Else if
    ``invoice_id`` is provided, filter by invoice. Always farm-scoped.
    """
    stmt = select(BenchmarkObservation).where(
        BenchmarkObservation.farm_id == farm_id,
    )
    if invoice_line_item_id is not None:
        stmt = stmt.where(
            BenchmarkObservation.invoice_line_item_id == invoice_line_item_id,
        )
    elif invoice_id is not None:
        stmt = stmt.where(BenchmarkObservation.invoice_id == invoice_id)
    stmt = stmt.order_by(BenchmarkObservation.observed_at)
    result = await session.execute(stmt)
    return list(result.scalars().all())
