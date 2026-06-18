"""Stock-in shim — derive eligible lines + idempotent insert."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)
from farm_copilot.database.stock_movements import insert_stock_movement_idempotent
from farm_copilot.domain.stock_in_derivation import (
    StockInDerivationResult,
    StockInEligible,
    StockInLineInput,
    StockInValidationGate,
    derive_invoice_stock_in,
)

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class StockInStepResult:
    completed: bool
    derivation: StockInDerivationResult | None = None
    created_count: int = 0
    already_present_count: int = 0
    skipped_count: int = 0
    reason: str = ""


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def resolve_stock_in(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
    has_blocking_findings: bool,
) -> StockInStepResult:
    """Derive stock-in eligibility, insert movements idempotently."""
    # 1. Verify invoice
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return StockInStepResult(
            completed=False,
            reason=f"Invoice {invoice_id} not found for farm {farm_id}",
        )

    # 2. Fetch line items
    line_rows = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    # 3. Build domain inputs
    gate = StockInValidationGate(
        blocked=has_blocking_findings,
        blocking_reason=(
            "Invoice has blocking validation findings"
            if has_blocking_findings
            else None
        ),
    )
    domain_lines = [
        StockInLineInput(
            line_item_id=str(row.id),
            line_order=row.line_order or 0,
            line_classification=(
                row.line_classification
                if isinstance(row.line_classification, str | None)
                else getattr(row.line_classification, "value", None)
            ),
            canonical_product_id=(
                str(row.canonical_product_id)
                if row.canonical_product_id
                else None
            ),
            quantity=row.quantity,
            unit=row.unit,
        )
        for row in line_rows
    ]

    # 4. Call domain function
    derivation = derive_invoice_stock_in(domain_lines, gate)

    # 5. Persist eligible movements
    created = 0
    already_present = 0
    for outcome in derivation.line_outcomes:
        if isinstance(outcome, StockInEligible):
            idempotency_key = (
                f"invoice:{invoice_id}:line:{outcome.line_item_id}"
            )
            _, was_created = await insert_stock_movement_idempotent(
                session,
                farm_id=farm_id,
                canonical_product_id=UUID(outcome.canonical_product_id),
                direction="in",
                quantity=outcome.quantity,
                unit=outcome.unit,
                idempotency_key=idempotency_key,
                effective_at=datetime.now(tz=UTC),
                invoice_id=invoice_id,
                invoice_line_item_id=UUID(outcome.line_item_id),
            )
            if was_created:
                created += 1
            else:
                already_present += 1

    return StockInStepResult(
        completed=True,
        derivation=derivation,
        created_count=created,
        already_present_count=already_present,
        skipped_count=derivation.counts.skipped,
    )
