"""Stock-in derivation — eligibility gating for stock movements.

Determines which invoice lines are eligible for stock-in movements
and which should be skipped (with structured reasons).  Stock
movements are gated by invoice validation: if the invoice has
blocking findings, ALL lines are skipped.

Pure domain logic: only stdlib + ``domain.money``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from .money import is_zero_or_negative

# ---------------------------------------------------------------------------
# Input types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class StockInLineInput:
    line_item_id: str
    line_order: int
    line_classification: str | None
    canonical_product_id: str | None
    quantity: Decimal | None
    unit: str | None


@dataclass(frozen=True)
class StockInValidationGate:
    blocked: bool
    blocking_reason: str | None


# ---------------------------------------------------------------------------
# Skip reason codes
# ---------------------------------------------------------------------------

StockInSkipReason = Literal[
    "not_stockable_input",
    "unresolved_classification",
    "no_canonical_product",
    "no_unit",
    "invalid_quantity",
    "blocked_by_validation",
]

ALL_SKIP_REASONS: tuple[StockInSkipReason, ...] = (
    "not_stockable_input",
    "unresolved_classification",
    "no_canonical_product",
    "no_unit",
    "invalid_quantity",
    "blocked_by_validation",
)

# ---------------------------------------------------------------------------
# Result types (discriminated union)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class StockInEligible:
    kind: Literal["eligible"] = "eligible"
    line_item_id: str = ""
    line_order: int = 0
    canonical_product_id: str = ""
    quantity: Decimal = Decimal("0")
    unit: str = ""


@dataclass(frozen=True)
class StockInSkip:
    kind: Literal["skip"] = "skip"
    line_item_id: str = ""
    line_order: int = 0
    skip_reason: StockInSkipReason = "blocked_by_validation"


StockInLineOutcome = StockInEligible | StockInSkip


@dataclass(frozen=True)
class StockInCounts:
    total: int
    eligible: int
    skipped: int
    skipped_by_reason: dict[str, int] = field(default_factory=dict)


@dataclass(frozen=True)
class StockInDerivationResult:
    line_outcomes: list[StockInLineOutcome]
    counts: StockInCounts
    blocked_by_validation: bool


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------


def derive_stock_in_outcome(
    line: StockInLineInput,
    gate: StockInValidationGate,
) -> StockInLineOutcome:
    """Evaluate a single line for stock-in eligibility.

    Evaluation order (first match wins):

    1. Validation gate blocked → skip
    2. No classification → skip
    3. Not stockable_input → skip
    4. No canonical product → skip
    5. No unit → skip
    6. Invalid quantity → skip
    7. All pass → eligible
    """
    if gate.blocked:
        return StockInSkip(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            skip_reason="blocked_by_validation",
        )

    if line.line_classification is None:
        return StockInSkip(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            skip_reason="unresolved_classification",
        )

    if line.line_classification != "stockable_input":
        return StockInSkip(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            skip_reason="not_stockable_input",
        )

    if not line.canonical_product_id:
        return StockInSkip(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            skip_reason="no_canonical_product",
        )

    if line.unit is None or not line.unit.strip():
        return StockInSkip(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            skip_reason="no_unit",
        )

    if line.quantity is None or is_zero_or_negative(line.quantity):
        return StockInSkip(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            skip_reason="invalid_quantity",
        )

    return StockInEligible(
        line_item_id=line.line_item_id,
        line_order=line.line_order,
        canonical_product_id=line.canonical_product_id,
        quantity=line.quantity,
        unit=line.unit.strip(),
    )


def derive_invoice_stock_in(
    lines: list[StockInLineInput],
    gate: StockInValidationGate,
) -> StockInDerivationResult:
    """Derive stock-in outcomes for all lines on an invoice."""
    outcomes = [derive_stock_in_outcome(line, gate) for line in lines]

    eligible_count = sum(1 for o in outcomes if isinstance(o, StockInEligible))
    skipped_count = sum(1 for o in outcomes if isinstance(o, StockInSkip))

    # Breakdown by skip reason, initialized with all reasons at 0
    skipped_by_reason: dict[str, int] = {r: 0 for r in ALL_SKIP_REASONS}
    for o in outcomes:
        if isinstance(o, StockInSkip):
            skipped_by_reason[o.skip_reason] = (
                skipped_by_reason.get(o.skip_reason, 0) + 1
            )

    return StockInDerivationResult(
        line_outcomes=outcomes,
        counts=StockInCounts(
            total=len(outcomes),
            eligible=eligible_count,
            skipped=skipped_count,
            skipped_by_reason=skipped_by_reason,
        ),
        blocked_by_validation=gate.blocked,
    )
