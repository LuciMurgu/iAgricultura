"""Invoice validation shim — benchmark + duplicate suspicion + validation rules."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_duplicate_candidates import (
    list_invoice_duplicate_candidates,
)
from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)
from farm_copilot.domain.benchmark_comparison import BenchmarkLineComparisonResult
from farm_copilot.domain.duplicate_suspicion import (
    DuplicateSuspicionCandidateInput,
    DuplicateSuspicionResult,
    DuplicateSuspicionTargetInput,
    resolve_duplicate_suspicion,
)
from farm_copilot.domain.invoice_validation import (
    InvoiceValidationResult,
    InvoiceValidationSummary,
    RunInvoiceValidationInput,
    ValidationInvoiceInput,
    ValidationLineItemInput,
    run_invoice_validation,
)
from farm_copilot.worker.benchmark_comparison import resolve_benchmark_comparison
from farm_copilot.worker.mappers import map_invoice

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class InvoiceValidationStepResult:
    completed: bool
    validation_results: list[InvoiceValidationResult] = field(
        default_factory=list
    )
    validation_summary: InvoiceValidationSummary | None = None
    duplicate_suspicion: DuplicateSuspicionResult | None = None
    benchmark_line_results: list[BenchmarkLineComparisonResult] = field(
        default_factory=list
    )
    has_blocking_findings: bool = False
    reason: str = ""


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def resolve_invoice_validation(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> InvoiceValidationStepResult:
    """Run benchmark + duplicate suspicion + validation rules."""
    # 1. Fetch invoice
    invoice_row = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice_row is None:
        return InvoiceValidationStepResult(
            completed=False,
            reason=f"Invoice {invoice_id} not found for farm {farm_id}",
        )

    domain_invoice = map_invoice(invoice_row)

    # 2. Fetch line items
    line_rows = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    # 3. Run benchmark comparison
    benchmark_step = await resolve_benchmark_comparison(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    # 4. Run duplicate suspicion
    target = DuplicateSuspicionTargetInput(
        id=domain_invoice.id,
        supplier_id=domain_invoice.supplier_id,
        invoice_number=domain_invoice.invoice_number,
        invoice_date=domain_invoice.invoice_date,
        total_amount=domain_invoice.total_amount,
        uploaded_document_id=domain_invoice.uploaded_document_id,
    )
    candidate_rows = await list_invoice_duplicate_candidates(
        session, farm_id=farm_id, exclude_invoice_id=invoice_id
    )
    dup_candidates = [
        DuplicateSuspicionCandidateInput(
            id=str(c.id),
            supplier_id=str(c.supplier_id) if c.supplier_id else None,
            invoice_number=c.invoice_number,
            invoice_date=(
                c.invoice_date.isoformat() if c.invoice_date else None
            ),
            total_amount=c.total_amount,
            uploaded_document_id=str(c.uploaded_document_id),
        )
        for c in candidate_rows
    ]
    dup_result = resolve_duplicate_suspicion(target, dup_candidates)

    # 5. Build validation input
    val_invoice = ValidationInvoiceInput(
        id=domain_invoice.id,
        subtotal_amount=domain_invoice.subtotal_amount,
        tax_amount=domain_invoice.tax_amount,
        total_amount=domain_invoice.total_amount,
    )
    val_lines = [
        ValidationLineItemInput(
            id=str(row.id),
            line_order=row.line_order or 0,
            quantity=row.quantity,
            unit_price=row.unit_price,
            line_total=row.line_total,
            tax_rate=row.tax_rate,
            tax_amount=row.tax_amount,
            line_classification=(
                row.line_classification
                if isinstance(row.line_classification, str | None)
                else getattr(row.line_classification, "value", None)
            ),
        )
        for row in line_rows
    ]

    val_input = RunInvoiceValidationInput(
        invoice=val_invoice,
        line_items=val_lines,
        benchmark_results=benchmark_step.line_results,
    )
    val_results, val_summary = run_invoice_validation(val_input)

    has_blocking = val_summary.has_blocking_findings or dup_result.blocking

    return InvoiceValidationStepResult(
        completed=True,
        validation_results=val_results,
        validation_summary=val_summary,
        duplicate_suspicion=dup_result,
        benchmark_line_results=benchmark_step.line_results,
        has_blocking_findings=has_blocking,
    )
