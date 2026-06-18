"""Procurement review database queries — farm-scoped data for review derivation.

Queries join invoices → line items → alerts → stock movements to build
the input needed by domain/procurement_review.py.

Every query enforces farm_id scoping.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    CanonicalProduct,
    Invoice,
    InvoiceAlertRecord,
    InvoiceLineItem,
    StockMovement,
    Supplier,
)

# ---------------------------------------------------------------------------
# Result types — plain data for the domain layer
# ---------------------------------------------------------------------------


@dataclass
class ProcurementLineRow:
    """One invoice line item with joined data."""

    line_item_id: str
    invoice_id: str
    invoice_number: str | None
    invoice_date: str | None
    supplier_name: str | None
    line_order: int
    raw_description: str | None
    quantity: Decimal | None
    unit: str | None
    unit_price: Decimal | None
    line_total: Decimal | None
    currency: str
    line_classification: str | None
    canonical_product_id: str | None
    canonical_product_name: str | None
    normalization_confidence: Decimal | None
    normalization_method: str | None
    has_stock_movement: bool


@dataclass
class ProcurementAlertRow:
    """One alert record with invoice context."""

    alert_id: str
    invoice_id: str
    invoice_number: str | None
    alert_key: str
    severity: str
    subject_type: str
    subject_id: str
    reason_codes: list[str]
    evidence: dict[str, object]
    confidence: str
    recommended_action: str


@dataclass
class ProcurementReviewData:
    """All data needed to build the procurement review."""

    farm_id: str
    farm_name: str
    total_invoices: int = 0
    lines: list[ProcurementLineRow] = field(default_factory=list)
    alerts: list[ProcurementAlertRow] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------


async def get_procurement_review_data(
    session: AsyncSession,
    *,
    farm_id: UUID,
    farm_name: str,
) -> ProcurementReviewData:
    """Fetch all data needed for procurement review derivation.

    Farm-scoped: every query filters by farm_id.
    """
    data = ProcurementReviewData(
        farm_id=str(farm_id),
        farm_name=farm_name,
    )

    # Total invoices
    count_result = await session.execute(
        select(func.count()).select_from(Invoice).where(
            Invoice.farm_id == farm_id,
        )
    )
    data.total_invoices = count_result.scalar_one()

    if data.total_invoices == 0:
        return data

    # Line items with joins
    # Subquery: line_item_ids that have stock movements
    stock_line_ids_sq = (
        select(StockMovement.invoice_line_item_id)
        .where(
            StockMovement.farm_id == farm_id,
            StockMovement.invoice_line_item_id.isnot(None),
        )
        .distinct()
        .subquery()
    )

    lines_stmt = (
        select(
            InvoiceLineItem.id,
            InvoiceLineItem.invoice_id,
            Invoice.invoice_number,
            Invoice.invoice_date,
            Supplier.name.label("supplier_name"),
            InvoiceLineItem.line_order,
            InvoiceLineItem.raw_description,
            InvoiceLineItem.quantity,
            InvoiceLineItem.unit,
            InvoiceLineItem.unit_price,
            InvoiceLineItem.line_total,
            Invoice.currency,
            InvoiceLineItem.line_classification,
            InvoiceLineItem.canonical_product_id,
            CanonicalProduct.name.label("canonical_product_name"),
            InvoiceLineItem.normalization_confidence,
            InvoiceLineItem.normalization_method,
            # Check if this line has a stock movement
            InvoiceLineItem.id.in_(select(stock_line_ids_sq.c.invoice_line_item_id)).label(
                "has_stock_movement"
            ),
        )
        .join(Invoice, InvoiceLineItem.invoice_id == Invoice.id)
        .outerjoin(Supplier, Invoice.supplier_id == Supplier.id)
        .outerjoin(
            CanonicalProduct,
            InvoiceLineItem.canonical_product_id == CanonicalProduct.id,
        )
        .where(Invoice.farm_id == farm_id)
        .order_by(Invoice.invoice_date.desc(), InvoiceLineItem.line_order)
    )

    lines_result = await session.execute(lines_stmt)
    for row in lines_result.all():
        inv_date = row.invoice_date
        date_str = inv_date.isoformat() if inv_date is not None else None

        classification = row.line_classification
        class_str: str | None = None
        if classification is not None:
            class_str = (
                classification.value
                if hasattr(classification, "value")
                else str(classification)
            )

        data.lines.append(
            ProcurementLineRow(
                line_item_id=str(row.id),
                invoice_id=str(row.invoice_id),
                invoice_number=row.invoice_number,
                invoice_date=date_str,
                supplier_name=row.supplier_name,
                line_order=row.line_order,
                raw_description=row.raw_description,
                quantity=row.quantity,
                unit=row.unit,
                unit_price=row.unit_price,
                line_total=row.line_total,
                currency=row.currency,
                line_classification=class_str,
                canonical_product_id=(
                    str(row.canonical_product_id)
                    if row.canonical_product_id is not None
                    else None
                ),
                canonical_product_name=row.canonical_product_name,
                normalization_confidence=row.normalization_confidence,
                normalization_method=row.normalization_method,
                has_stock_movement=bool(row.has_stock_movement),
            )
        )

    # Alerts — farm-scoped
    alerts_stmt = (
        select(
            InvoiceAlertRecord.id,
            InvoiceAlertRecord.invoice_id,
            Invoice.invoice_number,
            InvoiceAlertRecord.alert_key,
            InvoiceAlertRecord.severity,
            InvoiceAlertRecord.subject_type,
            InvoiceAlertRecord.subject_id,
            InvoiceAlertRecord.reason_codes,
            InvoiceAlertRecord.evidence,
            InvoiceAlertRecord.confidence,
            InvoiceAlertRecord.recommended_action,
        )
        .join(Invoice, InvoiceAlertRecord.invoice_id == Invoice.id)
        .where(InvoiceAlertRecord.farm_id == farm_id)
        .order_by(InvoiceAlertRecord.created_at.desc())
    )

    alerts_result = await session.execute(alerts_stmt)
    for row in alerts_result.all():
        # reason_codes is stored as JSON (list)
        reason_codes = row.reason_codes
        if isinstance(reason_codes, dict):
            reason_codes = list(reason_codes.values())
        elif not isinstance(reason_codes, list):
            reason_codes = []

        data.alerts.append(
            ProcurementAlertRow(
                alert_id=str(row.id),
                invoice_id=str(row.invoice_id),
                invoice_number=row.invoice_number,
                alert_key=row.alert_key,
                severity=row.severity,
                subject_type=row.subject_type,
                subject_id=row.subject_id,
                reason_codes=reason_codes,
                evidence=row.evidence if isinstance(row.evidence, dict) else {},
                confidence=row.confidence,
                recommended_action=row.recommended_action,
            )
        )

    return data
