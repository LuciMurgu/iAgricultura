"""Benchmark comparison shim — fetch observations + domain comparison."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.benchmark_observations import (
    list_benchmark_observations,
)
from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)
from farm_copilot.domain.benchmark_comparison import (
    BenchmarkComparisonSummary,
    BenchmarkLineComparisonResult,
    BenchmarkLineInput,
    BenchmarkObservationInput,
    resolve_invoice_benchmark_comparison,
    summarize_benchmark_results,
)

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BenchmarkComparisonStepResult:
    completed: bool
    line_results: list[BenchmarkLineComparisonResult] = field(
        default_factory=list
    )
    summary: BenchmarkComparisonSummary | None = None
    reason: str = ""


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def resolve_benchmark_comparison(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> BenchmarkComparisonStepResult:
    """Fetch lines + observations → domain comparison → return results."""
    # 1. Verify invoice exists
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return BenchmarkComparisonStepResult(
            completed=False,
            reason=f"Invoice {invoice_id} not found for farm {farm_id}",
        )

    # 2. Fetch line items
    line_rows = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    currency = invoice.currency or "RON"

    # 3. Build domain line inputs
    domain_lines: list[BenchmarkLineInput] = []
    for row in line_rows:
        classification = (
            row.line_classification
            if isinstance(row.line_classification, str | None)
            else getattr(row.line_classification, "value", None)
        )
        domain_lines.append(
            BenchmarkLineInput(
                line_item_id=str(row.id),
                line_order=row.line_order or 0,
                line_classification=classification,
                canonical_product_id=(
                    str(row.canonical_product_id)
                    if row.canonical_product_id
                    else None
                ),
                normalized_unit=row.unit,
                unit_price=row.unit_price,
                currency=currency,
                ex_vat=None,
            )
        )

    # 4. Collect all observations for canonical products in this invoice
    product_ids = {
        row.canonical_product_id
        for row in line_rows
        if row.canonical_product_id is not None
    }
    all_observations: list[BenchmarkObservationInput] = []
    for product_id in product_ids:
        obs_rows = await list_benchmark_observations(
            session,
            farm_id=farm_id,
            canonical_product_id=product_id,
            normalized_unit="",  # We'll pass all and let domain filter
        )
        for obs in obs_rows:
            all_observations.append(
                BenchmarkObservationInput(
                    id=str(obs.id),
                    canonical_product_id=str(obs.canonical_product_id),
                    source_kind=(
                        obs.source_kind
                        if isinstance(obs.source_kind, str)
                        else obs.source_kind.value
                    ),
                    observed_at=(
                        obs.observed_at.isoformat()
                        if obs.observed_at
                        else ""
                    ),
                    normalized_unit=obs.normalized_unit or "",
                    normalized_unit_price=obs.normalized_unit_price,
                    currency=obs.currency or "RON",
                    ex_vat=obs.ex_vat,
                    freight_separated=obs.freight_separated,
                )
            )

    # 5. Run domain comparison
    line_results = resolve_invoice_benchmark_comparison(
        domain_lines, all_observations
    )
    summary = summarize_benchmark_results(line_results)

    return BenchmarkComparisonStepResult(
        completed=True,
        line_results=line_results,
        summary=summary,
    )
