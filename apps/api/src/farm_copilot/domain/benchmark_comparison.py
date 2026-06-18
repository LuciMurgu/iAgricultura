"""Benchmark comparison — coverage-tiered price deviation analysis.

Compares an invoice line's unit price against historical benchmark
observations.  Pure domain logic: no imports from ``database/``,
``contracts/``, ``worker/``, or ``api/``.

Result types use a ``kind`` discriminator field so callers can
pattern-match on the outcome.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from .money import deviation_percent, median

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STRONG_COVERAGE_MIN_OBSERVATIONS = 3


# ---------------------------------------------------------------------------
# Input types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BenchmarkObservationInput:
    id: str
    canonical_product_id: str
    source_kind: str  # "invoice" | "quote" | "manual_entry" | "trusted_feed"
    observed_at: str  # ISO timestamp
    normalized_unit: str
    normalized_unit_price: Decimal
    currency: str
    ex_vat: bool | None
    freight_separated: bool | None


@dataclass(frozen=True)
class BenchmarkLineInput:
    line_item_id: str
    line_order: int
    line_classification: str | None
    canonical_product_id: str | None
    normalized_unit: str | None
    unit_price: Decimal | None  # the paid price
    currency: str
    ex_vat: bool | None


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class NotBenchmarkEligible:
    line_item_id: str
    line_order: int
    reason: str
    kind: Literal["not_benchmark_eligible"] = "not_benchmark_eligible"


@dataclass(frozen=True)
class NoCanonicalProduct:
    line_item_id: str
    line_order: int
    reason: str
    kind: Literal["no_canonical_product"] = "no_canonical_product"


@dataclass(frozen=True)
class NoComparableBasis:
    line_item_id: str
    line_order: int
    reason: str
    kind: Literal["no_comparable_basis"] = "no_comparable_basis"


@dataclass(frozen=True)
class NoObservationsFound:
    line_item_id: str
    line_order: int
    reason: str
    kind: Literal["no_observations_found"] = "no_observations_found"


@dataclass(frozen=True)
class ComparableBasis:
    canonical_product_id: str
    normalized_unit: str
    currency: str
    ex_vat: bool | None


@dataclass(frozen=True)
class ComparisonAvailable:
    line_item_id: str
    line_order: int
    coverage_tier: str  # "strong" | "weak" | "none"
    benchmark_reference_price: Decimal  # median
    benchmark_observation_count: int
    benchmark_observation_ids: list[str] = field(default_factory=list)
    benchmark_source_kinds_summary: list[str] = field(default_factory=list)
    benchmark_window_from: str = ""  # ISO timestamp
    benchmark_window_to: str = ""  # ISO timestamp
    comparable_basis: ComparableBasis | None = None
    paid_unit_price: Decimal = Decimal(0)
    deviation_amount: Decimal = Decimal(0)  # paid - reference
    deviation_percent: Decimal = Decimal(0)  # percentage
    kind: Literal["comparison_available"] = "comparison_available"


BenchmarkLineComparisonResult = (
    NotBenchmarkEligible
    | NoCanonicalProduct
    | NoComparableBasis
    | NoObservationsFound
    | ComparisonAvailable
)


@dataclass(frozen=True)
class BenchmarkComparisonSummary:
    total_lines: int
    eligible_lines: int
    ineligible_lines: int
    compared_lines: int
    not_compared_lines: int
    coverage_strong: int
    coverage_weak: int
    coverage_none: int


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------


def filter_comparable_observations(
    line: BenchmarkLineInput,
    observations: list[BenchmarkObservationInput],
) -> list[BenchmarkObservationInput]:
    """Filter observations to those comparable with *line*.

    Rules (ALL must pass):
    - Same ``canonical_product_id``
    - Same ``normalized_unit``
    - Same ``currency``
    - If both ``ex_vat`` are known (not ``None``), they must match
    - Exclude observations with ``freight_separated == False``
      (embedded freight is not comparable)
    """
    result: list[BenchmarkObservationInput] = []
    for obs in observations:
        if obs.canonical_product_id != line.canonical_product_id:
            continue
        if obs.normalized_unit != line.normalized_unit:
            continue
        if obs.currency != line.currency:
            continue
        # ex_vat compatibility: both known → must match
        if (
            line.ex_vat is not None
            and obs.ex_vat is not None
            and line.ex_vat != obs.ex_vat
        ):
            continue
        # freight_separated == False → embedded freight, not comparable
        if obs.freight_separated is False:
            continue
        result.append(obs)
    return result


def derive_coverage_tier(count: int) -> str:
    """Derive coverage tier from observation count.

    - 0 → ``"none"``
    - 1–2 → ``"weak"``
    - ≥3 → ``"strong"``
    """
    if count == 0:
        return "none"
    if count < STRONG_COVERAGE_MIN_OBSERVATIONS:
        return "weak"
    return "strong"


def resolve_benchmark_comparison(
    line: BenchmarkLineInput,
    observations: list[BenchmarkObservationInput],
) -> BenchmarkLineComparisonResult:
    """Compare a single invoice line against benchmark observations."""

    # 1. Only stockable_input lines are eligible
    if line.line_classification != "stockable_input":
        return NotBenchmarkEligible(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            reason=f"Line classification is '{line.line_classification}', not stockable_input",
        )

    # 2. Must have canonical_product_id
    if line.canonical_product_id is None:
        return NoCanonicalProduct(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            reason="Line has no canonical product assignment",
        )

    # 3. Must have unit_price and normalized_unit
    if line.unit_price is None or line.normalized_unit is None:
        return NoComparableBasis(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            reason="Line is missing unit_price or normalized_unit",
        )

    # 4. Filter to comparable observations
    comparable = filter_comparable_observations(line, observations)
    if not comparable:
        return NoObservationsFound(
            line_item_id=line.line_item_id,
            line_order=line.line_order,
            reason="No comparable benchmark observations found",
        )

    # 5. Derive coverage tier
    tier = derive_coverage_tier(len(comparable))

    # 6. Compute reference price = median
    prices = [obs.normalized_unit_price for obs in comparable]
    reference_price = median(prices)

    # 7. Compute deviation
    dev_amount = line.unit_price - reference_price
    dev_pct = deviation_percent(line.unit_price, reference_price)

    # 8. Summarize observation window and source kinds
    timestamps = sorted(obs.observed_at for obs in comparable)
    source_kinds = sorted(set(obs.source_kind for obs in comparable))

    basis = ComparableBasis(
        canonical_product_id=line.canonical_product_id,
        normalized_unit=line.normalized_unit,
        currency=line.currency,
        ex_vat=line.ex_vat,
    )

    return ComparisonAvailable(
        line_item_id=line.line_item_id,
        line_order=line.line_order,
        coverage_tier=tier,
        benchmark_reference_price=reference_price,
        benchmark_observation_count=len(comparable),
        benchmark_observation_ids=[obs.id for obs in comparable],
        benchmark_source_kinds_summary=source_kinds,
        benchmark_window_from=timestamps[0],
        benchmark_window_to=timestamps[-1],
        comparable_basis=basis,
        paid_unit_price=line.unit_price,
        deviation_amount=dev_amount,
        deviation_percent=dev_pct,
    )


def resolve_invoice_benchmark_comparison(
    lines: list[BenchmarkLineInput],
    observations: list[BenchmarkObservationInput],
) -> list[BenchmarkLineComparisonResult]:
    """Run benchmark comparison for each line in an invoice."""
    return [resolve_benchmark_comparison(line, observations) for line in lines]


def summarize_benchmark_results(
    results: list[BenchmarkLineComparisonResult],
) -> BenchmarkComparisonSummary:
    """Aggregate benchmark results into a summary."""
    total = len(results)
    eligible = 0
    ineligible = 0
    compared = 0
    not_compared = 0
    strong = 0
    weak = 0
    none_tier = 0

    for r in results:
        if isinstance(r, NotBenchmarkEligible):
            ineligible += 1
        else:
            eligible += 1
            if isinstance(r, ComparisonAvailable):
                compared += 1
                if r.coverage_tier == "strong":
                    strong += 1
                elif r.coverage_tier == "weak":
                    weak += 1
                else:
                    none_tier += 1
            else:
                not_compared += 1

    return BenchmarkComparisonSummary(
        total_lines=total,
        eligible_lines=eligible,
        ineligible_lines=ineligible,
        compared_lines=compared,
        not_compared_lines=not_compared,
        coverage_strong=strong,
        coverage_weak=weak,
        coverage_none=none_tier,
    )
