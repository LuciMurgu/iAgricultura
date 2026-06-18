"""Exact normalization shim — per-line alias lookup + domain winner selection."""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)
from farm_copilot.database.invoice_line_normalization import (
    update_invoice_line_item_normalization,
)
from farm_copilot.database.normalization_lookup import (
    list_exact_normalization_candidates,
)
from farm_copilot.domain.exact_normalization import (
    ExactNormalizationCandidate,
    NormalizationWinner,
    ResolveExactNormalizationWinnerInput,
    resolve_exact_normalization_winner,
)
from farm_copilot.worker.mappers import map_canonical_product, map_product_alias

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LineNormalizationOutcome:
    line_item_id: str
    result_kind: Literal["winner", "ambiguous", "none", "skipped"]
    canonical_product_id: str | None = None


@dataclass(frozen=True)
class ExactNormalizationStepResult:
    completed: bool
    line_outcomes: list[LineNormalizationOutcome] = field(default_factory=list)
    winner_count: int = 0
    ambiguous_count: int = 0
    none_count: int = 0
    skipped_count: int = 0
    reason: str = ""


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def resolve_exact_normalization(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> ExactNormalizationStepResult:
    """Per-line alias lookup → domain winner selection → persist."""
    # 1. Verify invoice
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return ExactNormalizationStepResult(
            completed=False,
            reason=f"Invoice {invoice_id} not found for farm {farm_id}",
        )

    supplier_id = invoice.supplier_id

    # 2. Fetch line items
    line_rows = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    outcomes: list[LineNormalizationOutcome] = []
    winner_count = 0
    ambiguous_count = 0
    none_count = 0
    skipped_count = 0

    for row in line_rows:
        # Skip lines without a raw description
        if not row.raw_description or not row.raw_description.strip():
            skipped_count += 1
            outcomes.append(
                LineNormalizationOutcome(
                    line_item_id=str(row.id),
                    result_kind="skipped",
                )
            )
            continue

        # 3a. Lookup alias candidates from DB
        db_candidates = await list_exact_normalization_candidates(
            session,
            alias_text=row.raw_description.strip(),
            farm_id=farm_id,
            supplier_id=supplier_id,
        )

        if not db_candidates:
            none_count += 1
            outcomes.append(
                LineNormalizationOutcome(
                    line_item_id=str(row.id),
                    result_kind="none",
                )
            )
            continue

        # 3b. Map DB rows to domain candidates
        domain_candidates = [
            ExactNormalizationCandidate(
                product_alias=map_product_alias(alias_row),
                canonical_product=map_canonical_product(product_row),
            )
            for alias_row, product_row in db_candidates
        ]

        # 3c. Call domain winner resolution
        winner_input = ResolveExactNormalizationWinnerInput(
            farm_id=str(farm_id),
            supplier_id=str(supplier_id) if supplier_id else None,
            candidates=domain_candidates,
        )
        winner_result = resolve_exact_normalization_winner(winner_input)

        # 3d. Process result
        if isinstance(winner_result, NormalizationWinner) and winner_result.candidate:
            canonical_id = winner_result.candidate.canonical_product.id
            await update_invoice_line_item_normalization(
                session,
                line_item_id=row.id,
                canonical_product_id=UUID(canonical_id),
                confidence=Decimal("1.0"),
                method="exact_alias",
            )
            winner_count += 1
            outcomes.append(
                LineNormalizationOutcome(
                    line_item_id=str(row.id),
                    result_kind="winner",
                    canonical_product_id=canonical_id,
                )
            )
        elif winner_result.kind == "ambiguous":
            ambiguous_count += 1
            outcomes.append(
                LineNormalizationOutcome(
                    line_item_id=str(row.id),
                    result_kind="ambiguous",
                )
            )
        else:
            none_count += 1
            outcomes.append(
                LineNormalizationOutcome(
                    line_item_id=str(row.id),
                    result_kind="none",
                )
            )

    return ExactNormalizationStepResult(
        completed=True,
        line_outcomes=outcomes,
        winner_count=winner_count,
        ambiguous_count=ambiguous_count,
        none_count=none_count,
        skipped_count=skipped_count,
    )
