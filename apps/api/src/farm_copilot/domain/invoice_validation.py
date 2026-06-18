"""Invoice validation — deterministic rule engine.

Runs validation rules over invoice data and benchmark comparison
results, producing structured outcomes per rule.  Pure domain logic:
only stdlib + ``domain.money`` + ``domain.benchmark_comparison``.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from .benchmark_comparison import (
    BenchmarkLineComparisonResult,
    ComparisonAvailable,
)
from .money import (
    is_negative,
    is_zero_or_negative,
    money_abs_diff,
    money_add,
    money_mul,
    money_within_tolerance,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MONEY_TOLERANCE = Decimal("0.02")  # cent-level rounding tolerance
SUSPICIOUS_DEVIATION_THRESHOLD_PERCENT = Decimal("20.00")  # 20% above benchmark

# ---------------------------------------------------------------------------
# Input types
# ---------------------------------------------------------------------------

ValidationOutcome = Literal["pass", "warn", "fail", "not_evaluable"]


@dataclass(frozen=True)
class ValidationInvoiceInput:
    id: str
    subtotal_amount: Decimal | None
    tax_amount: Decimal | None
    total_amount: Decimal | None


@dataclass(frozen=True)
class ValidationLineItemInput:
    id: str
    line_order: int
    quantity: Decimal | None
    unit_price: Decimal | None
    line_total: Decimal | None
    tax_rate: Decimal | None
    tax_amount: Decimal | None
    line_classification: str | None


@dataclass(frozen=True)
class RunInvoiceValidationInput:
    invoice: ValidationInvoiceInput
    line_items: list[ValidationLineItemInput]
    benchmark_results: list[BenchmarkLineComparisonResult]


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class InvoiceValidationResult:
    rule_key: str
    subject_type: Literal["invoice", "invoice_line_item"]
    subject_id: str
    outcome: ValidationOutcome
    reason_code: str
    reason: str
    blocking: bool
    evidence: dict[str, object]


@dataclass(frozen=True)
class InvoiceValidationSummary:
    total_rules: int
    pass_count: int
    warn: int
    fail: int
    not_evaluable: int
    has_blocking_findings: bool


# ---------------------------------------------------------------------------
# Rule 1: Line total consistency
# ---------------------------------------------------------------------------


def validate_line_total_consistency(
    line: ValidationLineItemInput,
) -> InvoiceValidationResult:
    """Check ``quantity × unit_price ≈ line_total`` within tolerance."""
    if line.quantity is None or line.unit_price is None or line.line_total is None:
        return InvoiceValidationResult(
            rule_key="line_total_consistency",
            subject_type="invoice_line_item",
            subject_id=line.id,
            outcome="not_evaluable",
            reason_code="missing_fields",
            reason="Cannot evaluate: quantity, unit_price, or line_total is missing",
            blocking=False,
            evidence={
                "line_order": line.line_order,
                "quantity": line.quantity,
                "unit_price": line.unit_price,
                "line_total": line.line_total,
            },
        )

    expected = money_mul(line.quantity, line.unit_price)
    diff = money_abs_diff(line.line_total, expected)
    within = money_within_tolerance(line.line_total, expected, MONEY_TOLERANCE)

    outcome: ValidationOutcome = "pass" if within else "warn"
    reason_code = "consistent" if within else "inconsistent"
    reason = (
        f"Line total is consistent with qty × price (diff={diff})"
        if within
        else f"Line total differs from qty × price by {diff} (tolerance={MONEY_TOLERANCE})"
    )

    return InvoiceValidationResult(
        rule_key="line_total_consistency",
        subject_type="invoice_line_item",
        subject_id=line.id,
        outcome=outcome,
        reason_code=reason_code,
        reason=reason,
        blocking=False,
        evidence={
            "line_order": line.line_order,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "line_total": line.line_total,
            "expected_total": expected,
            "difference": diff,
            "tolerance": MONEY_TOLERANCE,
        },
    )


# ---------------------------------------------------------------------------
# Rule 2: Invoice total mismatch
# ---------------------------------------------------------------------------


def validate_invoice_total_mismatch(
    invoice: ValidationInvoiceInput,
    line_items: list[ValidationLineItemInput],
) -> InvoiceValidationResult:
    """Compare sum of line totals against invoice subtotal (or total)."""
    # Check if invoice has any amounts to compare against
    compare_amount = (
        invoice.subtotal_amount if invoice.subtotal_amount is not None else invoice.total_amount
    )
    if compare_amount is None:
        return InvoiceValidationResult(
            rule_key="invoice_total_mismatch",
            subject_type="invoice",
            subject_id=invoice.id,
            outcome="not_evaluable",
            reason_code="missing_invoice_totals",
            reason="Cannot evaluate: invoice has no subtotal or total amount",
            blocking=False,
            evidence={},
        )

    # Collect lines with totals
    line_totals = [li.line_total for li in line_items if li.line_total is not None]
    if not line_totals:
        return InvoiceValidationResult(
            rule_key="invoice_total_mismatch",
            subject_type="invoice",
            subject_id=invoice.id,
            outcome="not_evaluable",
            reason_code="no_line_totals",
            reason="Cannot evaluate: no line items have totals",
            blocking=False,
            evidence={},
        )

    # Sum line totals
    lines_sum = line_totals[0]
    for lt in line_totals[1:]:
        lines_sum = money_add(lines_sum, lt)

    diff = money_abs_diff(lines_sum, compare_amount)
    within = money_within_tolerance(lines_sum, compare_amount, MONEY_TOLERANCE)

    compare_field = "subtotal_amount" if invoice.subtotal_amount is not None else "total_amount"
    outcome: ValidationOutcome = "pass" if within else "warn"
    reason_code = "consistent" if within else "mismatch"
    reason = (
        f"Sum of line totals matches invoice {compare_field} (diff={diff})"
        if within
        else f"Sum of line totals differs from invoice {compare_field} by {diff}"
    )

    return InvoiceValidationResult(
        rule_key="invoice_total_mismatch",
        subject_type="invoice",
        subject_id=invoice.id,
        outcome=outcome,
        reason_code=reason_code,
        reason=reason,
        blocking=False,
        evidence={
            "lines_sum": lines_sum,
            "compare_field": compare_field,
            "compare_amount": compare_amount,
            "difference": diff,
            "tolerance": MONEY_TOLERANCE,
        },
    )


# ---------------------------------------------------------------------------
# Rule 3: Suspicious unit price
# ---------------------------------------------------------------------------


def validate_suspicious_unit_price(
    benchmark_result: BenchmarkLineComparisonResult,
) -> InvoiceValidationResult:
    """Flag unit prices that deviate >20% above the benchmark median."""
    if not isinstance(benchmark_result, ComparisonAvailable):
        # Map non-comparison kinds to reason_codes
        reason_code = benchmark_result.kind
        return InvoiceValidationResult(
            rule_key="suspicious_unit_price",
            subject_type="invoice_line_item",
            subject_id=benchmark_result.line_item_id,
            outcome="not_evaluable",
            reason_code=reason_code,
            reason=f"Cannot evaluate suspicious price: {benchmark_result.reason}",
            blocking=False,
            evidence={"benchmark_kind": benchmark_result.kind},
        )

    if benchmark_result.coverage_tier != "strong":
        return InvoiceValidationResult(
            rule_key="suspicious_unit_price",
            subject_type="invoice_line_item",
            subject_id=benchmark_result.line_item_id,
            outcome="not_evaluable",
            reason_code="weak_benchmark_coverage",
            reason=f"Benchmark coverage is '{benchmark_result.coverage_tier}', not strong",
            blocking=False,
            evidence={
                "coverage_tier": benchmark_result.coverage_tier,
                "observation_count": benchmark_result.benchmark_observation_count,
            },
        )

    above = benchmark_result.deviation_percent > SUSPICIOUS_DEVIATION_THRESHOLD_PERCENT
    outcome: ValidationOutcome = "warn" if above else "pass"
    reason_code = "above_threshold" if above else "within_threshold"
    reason = (
        f"Unit price deviates {benchmark_result.deviation_percent}% from benchmark "
        f"(threshold={SUSPICIOUS_DEVIATION_THRESHOLD_PERCENT}%)"
    )

    evidence: dict[str, object] = {
        "coverage_tier": benchmark_result.coverage_tier,
        "observation_count": benchmark_result.benchmark_observation_count,
        "observation_ids": benchmark_result.benchmark_observation_ids,
        "source_kinds": benchmark_result.benchmark_source_kinds_summary,
        "window_from": benchmark_result.benchmark_window_from,
        "window_to": benchmark_result.benchmark_window_to,
        "paid_price": benchmark_result.paid_unit_price,
        "reference_price": benchmark_result.benchmark_reference_price,
        "deviation_amount": benchmark_result.deviation_amount,
        "deviation_percent": benchmark_result.deviation_percent,
        "threshold": SUSPICIOUS_DEVIATION_THRESHOLD_PERCENT,
    }
    if benchmark_result.comparable_basis is not None:
        evidence["comparable_basis"] = {
            "canonical_product_id": benchmark_result.comparable_basis.canonical_product_id,
            "normalized_unit": benchmark_result.comparable_basis.normalized_unit,
            "currency": benchmark_result.comparable_basis.currency,
            "ex_vat": benchmark_result.comparable_basis.ex_vat,
        }

    return InvoiceValidationResult(
        rule_key="suspicious_unit_price",
        subject_type="invoice_line_item",
        subject_id=benchmark_result.line_item_id,
        outcome=outcome,
        reason_code=reason_code,
        reason=reason,
        blocking=False,
        evidence=evidence,
    )


# ---------------------------------------------------------------------------
# Rule 4: Abnormal values
# ---------------------------------------------------------------------------


def validate_abnormal_values(
    line: ValidationLineItemInput,
) -> list[InvoiceValidationResult]:
    """Detect abnormal quantities, prices, and totals on non-discount lines.

    Returns 0 to 3 results (one per detected anomaly).
    """
    results: list[InvoiceValidationResult] = []

    # Discount lines are expected to have negative values
    if line.line_classification == "discount_adjustment":
        return results

    # Check negative quantity
    if line.quantity is not None and is_negative(line.quantity):
        results.append(
            InvoiceValidationResult(
                rule_key="abnormal_negative_quantity",
                subject_type="invoice_line_item",
                subject_id=line.id,
                outcome="warn",
                reason_code="negative_quantity",
                reason=f"Non-discount line has negative quantity: {line.quantity}",
                blocking=False,
                evidence={
                    "line_order": line.line_order,
                    "quantity": line.quantity,
                    "line_classification": line.line_classification,
                },
            )
        )

    # Check zero or negative unit price
    if line.unit_price is not None and is_zero_or_negative(line.unit_price):
        results.append(
            InvoiceValidationResult(
                rule_key="abnormal_unit_price",
                subject_type="invoice_line_item",
                subject_id=line.id,
                outcome="warn",
                reason_code="zero_or_negative_unit_price",
                reason=f"Non-discount line has zero or negative unit price: {line.unit_price}",
                blocking=False,
                evidence={
                    "line_order": line.line_order,
                    "unit_price": line.unit_price,
                    "line_classification": line.line_classification,
                },
            )
        )

    # Check zero or negative line total
    if line.line_total is not None and is_zero_or_negative(line.line_total):
        results.append(
            InvoiceValidationResult(
                rule_key="abnormal_line_total",
                subject_type="invoice_line_item",
                subject_id=line.id,
                outcome="warn",
                reason_code="zero_or_negative_line_total",
                reason=f"Non-discount line has zero or negative line total: {line.line_total}",
                blocking=False,
                evidence={
                    "line_order": line.line_order,
                    "line_total": line.line_total,
                    "line_classification": line.line_classification,
                },
            )
        )

    return results


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


def summarize_validation_results(
    results: list[InvoiceValidationResult],
) -> InvoiceValidationSummary:
    """Aggregate validation results into a summary."""
    pass_count = 0
    warn = 0
    fail = 0
    not_evaluable = 0
    has_blocking = False

    for r in results:
        if r.outcome == "pass":
            pass_count += 1
        elif r.outcome == "warn":
            warn += 1
        elif r.outcome == "fail":
            fail += 1
        else:
            not_evaluable += 1

        if r.blocking:
            has_blocking = True

    return InvoiceValidationSummary(
        total_rules=len(results),
        pass_count=pass_count,
        warn=warn,
        fail=fail,
        not_evaluable=not_evaluable,
        has_blocking_findings=has_blocking,
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def run_invoice_validation(
    validation_input: RunInvoiceValidationInput,
) -> tuple[list[InvoiceValidationResult], InvoiceValidationSummary]:
    """Run all validation rules and return results + summary."""
    results: list[InvoiceValidationResult] = []

    # Rule 1: Line total consistency for each line
    for line in validation_input.line_items:
        results.append(validate_line_total_consistency(line))

    # Rule 4: Abnormal values for each line (before rule 2 so line-level rules group)
    for line in validation_input.line_items:
        results.extend(validate_abnormal_values(line))

    # Rule 2: Invoice total mismatch (once)
    results.append(
        validate_invoice_total_mismatch(
            validation_input.invoice,
            validation_input.line_items,
        )
    )

    # Rule 3: Suspicious unit price for each benchmark result
    for br in validation_input.benchmark_results:
        results.append(validate_suspicious_unit_price(br))

    summary = summarize_validation_results(results)
    return results, summary
