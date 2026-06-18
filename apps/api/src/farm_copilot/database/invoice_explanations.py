"""Invoice explanation persistence — CRUD for persisted explanations."""

from __future__ import annotations

import json
from dataclasses import asdict
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.domain.explanation_derivation import InvoiceExplanation

from .models import InvoiceExplanationRecord


def _serialize_dataclass(obj: object) -> dict:
    """Convert a typed dataclass to a JSON-safe dict.

    Handles Decimal → str conversion for JSONB compatibility.
    """
    raw = asdict(obj)  # type: ignore[arg-type]
    return json.loads(json.dumps(raw, default=str))


async def persist_invoice_explanations(
    session: AsyncSession,
    *,
    farm_id: UUID,
    invoice_id: UUID,
    explanations: list[InvoiceExplanation],
    alert_id_map: dict[str, UUID],
) -> list[InvoiceExplanationRecord]:
    """Persist explanations for an invoice. Deletes existing first.

    Each explanation links to its source alert via ``alert_id_map``.
    Key format: ``"{alert_key}:{subject_id}"``.
    Serializes ``data_used`` and ``source_references`` via
    ``dataclasses.asdict()``.
    """
    await delete_explanations_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    records: list[InvoiceExplanationRecord] = []
    for expl in explanations:
        map_key = f"{expl.source_alert_key}:{expl.subject_id}"
        alert_id = alert_id_map.get(map_key)
        if alert_id is None:
            continue  # skip if no matching alert record

        record = InvoiceExplanationRecord(
            farm_id=farm_id,
            invoice_id=invoice_id,
            alert_id=alert_id,
            explanation_kind=expl.explanation_kind,
            subject_type=expl.subject_type,
            subject_id=expl.subject_id,
            line_order=expl.line_order,
            what_happened=expl.what_happened,
            data_used=_serialize_dataclass(expl.data_used),
            why_it_matters=expl.why_it_matters,
            support_strength=expl.support_strength,
            next_action=expl.next_action,
            source_references=_serialize_dataclass(
                expl.source_references
            ),
        )
        session.add(record)
        records.append(record)

    await session.flush()
    for record in records:
        await session.refresh(record)

    return records


async def get_explanations_by_invoice_id(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> list[InvoiceExplanationRecord]:
    """Fetch all persisted explanations for an invoice."""
    stmt = (
        select(InvoiceExplanationRecord)
        .where(
            InvoiceExplanationRecord.invoice_id == invoice_id,
            InvoiceExplanationRecord.farm_id == farm_id,
        )
        .order_by(InvoiceExplanationRecord.created_at)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def delete_explanations_by_invoice_id(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> int:
    """Delete all explanations for an invoice. Returns count deleted."""
    stmt = (
        delete(InvoiceExplanationRecord)
        .where(
            InvoiceExplanationRecord.invoice_id == invoice_id,
            InvoiceExplanationRecord.farm_id == farm_id,
        )
        .returning(InvoiceExplanationRecord.id)
    )
    result = await session.execute(stmt)
    rows = result.all()
    await session.flush()
    return len(rows)
