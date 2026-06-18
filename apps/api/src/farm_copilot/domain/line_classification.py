"""Line classification — keyword-based invoice line classification.

Classifies invoice lines as ``stockable_input``, ``non_stockable_charge``,
``service``, or ``discount_adjustment`` using conservative keyword patterns.
Pure domain logic: only stdlib.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from .money import is_negative

# ---------------------------------------------------------------------------
# Keyword patterns (RO + EN, case-insensitive substring matching)
# ---------------------------------------------------------------------------

DISCOUNT_PATTERNS: tuple[str, ...] = (
    "reducere",
    "rabat",
    "discount",
    "remiza",
    "bonificatie",
    "bonificație",
    "rebate",
    "credit note",
    "adjustment",
)

SERVICE_PATTERNS: tuple[str, ...] = (
    "serviciu",
    "servicii",
    "prestari servicii",
    "prestări servicii",
    "consultanta",
    "consultanță",
    "analiz",
    "aplicare",
    "manopera",
    "manoperă",
    "service",
    "consulting",
    "analysis",
    "application fee",
)

CHARGE_PATTERNS: tuple[str, ...] = (
    "transport",
    "transportul",
    "taxa transport",
    "cheltuieli transport",
    "expediere",
    "livrare",
    "manipulare",
    "costuri logistice",
    "taxe administrative",
    "freight",
    "shipping",
    "delivery",
    "handling",
    "logistics",
)

# ---------------------------------------------------------------------------
# Input / Output types
# ---------------------------------------------------------------------------

ClassificationReasonCode = Literal[
    "keyword_freight",
    "keyword_transport",
    "keyword_service",
    "keyword_discount",
    "keyword_rebate",
    "negative_adjustment",
    "default_stockable",
    "no_description",
]


@dataclass(frozen=True)
class LineClassificationInput:
    line_item_id: str
    raw_description: str | None
    line_order: int | None
    quantity: Decimal | None
    unit_price: Decimal | None
    line_total: Decimal | None
    canonical_product_id: str | None


@dataclass(frozen=True)
class LineClassificationOutcome:
    line_item_id: str
    classification: str | None
    determined: bool
    reason_code: ClassificationReasonCode
    matched_pattern: str | None


@dataclass(frozen=True)
class ClassificationCounts:
    total: int
    stockable_input: int
    non_stockable_charge: int
    service: int
    discount_adjustment: int
    unresolved: int


@dataclass(frozen=True)
class InvoiceLineClassificationResult:
    line_outcomes: list[LineClassificationOutcome]
    counts: ClassificationCounts
    deterministic: int
    unresolved: int


# ---------------------------------------------------------------------------
# Classification logic
# ---------------------------------------------------------------------------


def _match_patterns(
    description_lower: str,
    patterns: tuple[str, ...],
) -> str | None:
    """Return the first pattern that matches as a substring, or ``None``."""
    for pattern in patterns:
        if pattern in description_lower:
            return pattern
    return None


def classify_invoice_line(
    line_input: LineClassificationInput,
) -> LineClassificationOutcome:
    """Classify a single invoice line by keyword matching.

    Priority order: no description → negative total → discount →
    service → charge → default stockable.
    """
    # No description → unresolved
    if line_input.raw_description is None or not line_input.raw_description.strip():
        return LineClassificationOutcome(
            line_item_id=line_input.line_item_id,
            classification=None,
            determined=False,
            reason_code="no_description",
            matched_pattern=None,
        )

    # Negative line_total → discount_adjustment
    if line_input.line_total is not None and is_negative(line_input.line_total):
        return LineClassificationOutcome(
            line_item_id=line_input.line_item_id,
            classification="discount_adjustment",
            determined=True,
            reason_code="negative_adjustment",
            matched_pattern=None,
        )

    desc_lower = line_input.raw_description.lower()

    # Discount patterns
    matched = _match_patterns(desc_lower, DISCOUNT_PATTERNS)
    if matched is not None:
        return LineClassificationOutcome(
            line_item_id=line_input.line_item_id,
            classification="discount_adjustment",
            determined=True,
            reason_code="keyword_discount",
            matched_pattern=matched,
        )

    # Service patterns
    matched = _match_patterns(desc_lower, SERVICE_PATTERNS)
    if matched is not None:
        return LineClassificationOutcome(
            line_item_id=line_input.line_item_id,
            classification="service",
            determined=True,
            reason_code="keyword_service",
            matched_pattern=matched,
        )

    # Charge patterns
    matched = _match_patterns(desc_lower, CHARGE_PATTERNS)
    if matched is not None:
        return LineClassificationOutcome(
            line_item_id=line_input.line_item_id,
            classification="non_stockable_charge",
            determined=True,
            reason_code="keyword_freight",
            matched_pattern=matched,
        )

    # Default → stockable_input
    return LineClassificationOutcome(
        line_item_id=line_input.line_item_id,
        classification="stockable_input",
        determined=True,
        reason_code="default_stockable",
        matched_pattern=None,
    )


def classify_invoice_lines(
    inputs: list[LineClassificationInput],
) -> InvoiceLineClassificationResult:
    """Run classification for each line, compute counts and summary."""
    outcomes = [classify_invoice_line(inp) for inp in inputs]

    stockable = sum(1 for o in outcomes if o.classification == "stockable_input")
    charge = sum(1 for o in outcomes if o.classification == "non_stockable_charge")
    service = sum(1 for o in outcomes if o.classification == "service")
    discount = sum(1 for o in outcomes if o.classification == "discount_adjustment")
    unresolved = sum(1 for o in outcomes if o.classification is None)

    counts = ClassificationCounts(
        total=len(outcomes),
        stockable_input=stockable,
        non_stockable_charge=charge,
        service=service,
        discount_adjustment=discount,
        unresolved=unresolved,
    )

    return InvoiceLineClassificationResult(
        line_outcomes=outcomes,
        counts=counts,
        deterministic=len(outcomes) - unresolved,
        unresolved=unresolved,
    )
