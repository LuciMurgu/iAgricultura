"""Line correction shim — apply correction + auto-alias + re-validate."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_items import get_invoice_line_item_by_id
from farm_copilot.database.invoice_line_normalization import (
    update_invoice_line_item_normalization,
)
from farm_copilot.database.invoice_status import update_invoice_status
from farm_copilot.database.line_corrections import insert_line_correction
from farm_copilot.database.product_aliases import create_alias_if_not_exists
from farm_copilot.domain.alert_derivation import InvoiceAlertsResult
from farm_copilot.domain.explanation_derivation import InvoiceExplanationsResult
from farm_copilot.worker.alert_derivation import derive_alerts_from_validation
from farm_copilot.worker.explanation_derivation import (
    derive_explanations_from_alerts,
)
from farm_copilot.worker.invoice_validation import (
    InvoiceValidationStepResult,
    resolve_invoice_validation,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LineCorrectionApplied:
    kind: Literal["applied"] = "applied"
    line_item_id: str = ""
    new_canonical_product_id: str = ""
    alias_created: bool = False
    alias_text: str | None = None
    validation_rerun: InvoiceValidationStepResult | None = None
    alerts_rerun: InvoiceAlertsResult | None = None
    explanations_rerun: InvoiceExplanationsResult | None = None


@dataclass(frozen=True)
class LineCorrectionAlreadyMapped:
    kind: Literal["already_mapped"] = "already_mapped"
    line_item_id: str = ""
    existing_canonical_product_id: str = ""


@dataclass(frozen=True)
class LineCorrectionNotFound:
    kind: Literal["not_found"] = "not_found"
    reason: str = ""


LineCorrectionResult = (
    LineCorrectionApplied
    | LineCorrectionAlreadyMapped
    | LineCorrectionNotFound
)

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def apply_unresolved_line_correction(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
    line_item_id: UUID,
    new_canonical_product_id: UUID,
    actor: str | None = None,
    reason: str | None = None,
) -> LineCorrectionResult:
    """Apply a correction to an unresolved line, then re-validate."""
    # 1. Verify invoice
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return LineCorrectionNotFound(
            reason=f"Invoice {invoice_id} not found for farm {farm_id}"
        )

    # 2. Fetch line item
    line_item = await get_invoice_line_item_by_id(
        session, line_item_id=line_item_id
    )
    if line_item is None:
        return LineCorrectionNotFound(
            reason=f"Line item {line_item_id} not found"
        )

    # 3. Check if already mapped
    if line_item.canonical_product_id is not None:
        return LineCorrectionAlreadyMapped(
            line_item_id=str(line_item_id),
            existing_canonical_product_id=str(
                line_item.canonical_product_id
            ),
        )

    # 4. Insert correction record
    await insert_line_correction(
        session,
        farm_id=farm_id,
        invoice_id=invoice_id,
        invoice_line_item_id=line_item_id,
        correction_kind="manual_product_assignment",
        previous_canonical_product_id=None,
        new_canonical_product_id=new_canonical_product_id,
        previous_normalization_method=line_item.normalization_method,
        previous_normalization_confidence=line_item.normalization_confidence,
        previous_raw_description=line_item.raw_description,
        actor=actor,
        reason=reason,
    )

    # 5. Update line item
    from decimal import Decimal

    await update_invoice_line_item_normalization(
        session,
        line_item_id=line_item_id,
        canonical_product_id=new_canonical_product_id,
        confidence=Decimal("1.0"),
        method="manual_correction",
    )

    # 5.5 Auto-create alias from correction
    alias_created = False
    alias_text_out: str | None = None
    if line_item.raw_description:
        supplier_id = invoice.supplier_id
        alias, was_created = await create_alias_if_not_exists(
            session,
            canonical_product_id=new_canonical_product_id,
            alias_text=line_item.raw_description,
            farm_id=farm_id,
            supplier_id=supplier_id,
            source="manual_correction",
        )
        alias_created = was_created
        if alias is not None:
            alias_text_out = alias.alias_text
        if was_created:
            logger.info(
                "Auto-created alias: '%s' → product %s "
                "(farm=%s, supplier=%s)",
                line_item.raw_description,
                new_canonical_product_id,
                farm_id,
                supplier_id,
            )

    # 6. Re-run validation
    validation_result = await resolve_invoice_validation(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    # 7. Derive alerts + explanations
    alerts_result: InvoiceAlertsResult | None = None
    explanations_result: InvoiceExplanationsResult | None = None

    if (
        validation_result.completed
        and validation_result.duplicate_suspicion is not None
    ):
        alerts_result = derive_alerts_from_validation(
            invoice_id=str(invoice_id),
            farm_id=str(farm_id),
            validation_results=validation_result.validation_results,
            duplicate_suspicion=validation_result.duplicate_suspicion,
        )
        explanations_result = derive_explanations_from_alerts(
            invoice_id=str(invoice_id),
            farm_id=str(farm_id),
            alerts=alerts_result.alerts,
        )

    # 8. Update invoice status based on validation
    new_status = (
        "needs_review"
        if validation_result.has_blocking_findings
        else "validated"
    )
    await update_invoice_status(
        session,
        invoice_id=invoice_id,
        farm_id=farm_id,
        status=new_status,
    )

    return LineCorrectionApplied(
        line_item_id=str(line_item_id),
        new_canonical_product_id=str(new_canonical_product_id),
        alias_created=alias_created,
        alias_text=alias_text_out,
        validation_rerun=validation_result,
        alerts_rerun=alerts_result,
        explanations_rerun=explanations_result,
    )
