"""Line classification shim — classify + persist."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_classification import (
    update_invoice_line_item_classification,
)
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)
from farm_copilot.domain.line_classification import (
    InvoiceLineClassificationResult,
    LineClassificationInput,
    classify_invoice_lines,
)

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LineClassificationStepResult:
    completed: bool
    classification_result: InvoiceLineClassificationResult | None = None
    reason: str = ""


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def resolve_line_classification(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> LineClassificationStepResult:
    """Fetch lines, classify via domain function, persist results."""
    # 1. Verify invoice exists
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return LineClassificationStepResult(
            completed=False,
            reason=f"Invoice {invoice_id} not found for farm {farm_id}",
        )

    # 2. Fetch line items
    line_rows = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if not line_rows:
        return LineClassificationStepResult(
            completed=True,
            classification_result=None,
            reason="No line items to classify",
        )

    # 3. Map to domain inputs
    inputs = [
        LineClassificationInput(
            line_item_id=str(row.id),
            raw_description=row.raw_description,
            line_order=row.line_order,
            quantity=row.quantity,
            unit_price=row.unit_price,
            line_total=row.line_total,
            canonical_product_id=(
                str(row.canonical_product_id)
                if row.canonical_product_id is not None
                else None
            ),
        )
        for row in line_rows
    ]

    # 4. Call domain function
    result = classify_invoice_lines(inputs)

    # 5. Persist classifications
    for outcome in result.line_outcomes:
        if outcome.classification is not None:
            await update_invoice_line_item_classification(
                session,
                line_item_id=UUID(outcome.line_item_id),
                classification=outcome.classification,
            )

    return LineClassificationStepResult(
        completed=True,
        classification_result=result,
    )
