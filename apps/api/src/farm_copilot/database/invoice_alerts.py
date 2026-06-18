"""Invoice alert persistence — CRUD for persisted alerts."""

from __future__ import annotations

import json
from dataclasses import asdict
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.domain.alert_derivation import InvoiceAlert

from .models import InvoiceAlertRecord


def _serialize_evidence(evidence: object) -> dict:
    """Convert a typed evidence dataclass to a JSON-safe dict.

    Handles Decimal → str conversion for JSONB compatibility.
    """
    raw = asdict(evidence)  # type: ignore[arg-type]
    return json.loads(json.dumps(raw, default=str))


async def persist_invoice_alerts(
    session: AsyncSession,
    *,
    farm_id: UUID,
    invoice_id: UUID,
    alerts: list[InvoiceAlert],
) -> list[InvoiceAlertRecord]:
    """Persist alerts for an invoice. Deletes existing alerts first
    (replace pattern — safe for reprocessing).

    Serializes typed evidence via ``dataclasses.asdict()``.
    Returns the created DB rows (with generated IDs).
    """
    # Delete existing explanations first (FK dependency)
    await delete_alerts_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    records: list[InvoiceAlertRecord] = []
    for alert in alerts:
        record = InvoiceAlertRecord(
            farm_id=farm_id,
            invoice_id=invoice_id,
            alert_key=alert.alert_key,
            severity=alert.severity,
            subject_type=alert.subject_type,
            subject_id=alert.subject_id,
            reason_codes=list(alert.reason_codes),
            evidence=_serialize_evidence(alert.evidence),
            confidence=alert.confidence,
            recommended_action=alert.recommended_action,
        )
        session.add(record)
        records.append(record)

    await session.flush()
    for record in records:
        await session.refresh(record)

    return records


async def get_alerts_by_invoice_id(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> list[InvoiceAlertRecord]:
    """Fetch all persisted alerts for an invoice, ordered by created_at."""
    stmt = (
        select(InvoiceAlertRecord)
        .where(
            InvoiceAlertRecord.invoice_id == invoice_id,
            InvoiceAlertRecord.farm_id == farm_id,
        )
        .order_by(InvoiceAlertRecord.created_at)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def delete_alerts_by_invoice_id(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> int:
    """Delete all alerts for an invoice. Returns count deleted.

    Also deletes dependent explanations first (FK constraint).
    """
    from .invoice_explanations import delete_explanations_by_invoice_id

    await delete_explanations_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    stmt = (
        delete(InvoiceAlertRecord)
        .where(
            InvoiceAlertRecord.invoice_id == invoice_id,
            InvoiceAlertRecord.farm_id == farm_id,
        )
        .returning(InvoiceAlertRecord.id)
    )
    result = await session.execute(stmt)
    rows = result.all()
    await session.flush()
    return len(rows)


async def count_alerts_by_invoice_ids(
    session: AsyncSession,
    *,
    invoice_ids: list[UUID],
) -> dict[UUID, int]:
    """Count alerts for multiple invoices in one query.

    Returns {invoice_id: alert_count}. Used by list view to show
    alert badges without N+1 queries.
    """
    if not invoice_ids:
        return {}

    stmt = (
        select(
            InvoiceAlertRecord.invoice_id,
            func.count().label("cnt"),
        )
        .where(InvoiceAlertRecord.invoice_id.in_(invoice_ids))
        .group_by(InvoiceAlertRecord.invoice_id)
    )
    result = await session.execute(stmt)
    return {row[0]: row[1] for row in result.all()}


async def list_alerts_by_farm(
    session: AsyncSession,
    *,
    farm_id: UUID,
    severity: str | None = None,
    limit: int = 50,
) -> list[InvoiceAlertRecord]:
    """List alerts for a farm, optionally filtered by severity.

    Ordered by created_at descending. Used by /api/v1/alerts endpoint.
    """
    filters = [InvoiceAlertRecord.farm_id == farm_id]
    if severity is not None:
        filters.append(InvoiceAlertRecord.severity == severity)

    stmt = (
        select(InvoiceAlertRecord)
        .where(*filters)
        .order_by(InvoiceAlertRecord.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
