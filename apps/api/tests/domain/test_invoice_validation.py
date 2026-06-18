"""Tests for farm_copilot.domain.invoice_validation."""

from decimal import Decimal

from farm_copilot.domain.benchmark_comparison import (
    ComparableBasis,
    ComparisonAvailable,
    NoObservationsFound,
    NotBenchmarkEligible,
)
from farm_copilot.domain.invoice_validation import (
    InvoiceValidationSummary,
    RunInvoiceValidationInput,
    ValidationInvoiceInput,
    ValidationLineItemInput,
    run_invoice_validation,
    summarize_validation_results,
    validate_abnormal_values,
    validate_invoice_total_mismatch,
    validate_line_total_consistency,
    validate_suspicious_unit_price,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _line(
    *,
    line_id: str = "line-1",
    line_order: int = 1,
    quantity: Decimal | None = Decimal("10"),
    unit_price: Decimal | None = Decimal("5.00"),
    line_total: Decimal | None = Decimal("50.00"),
    tax_rate: Decimal | None = None,
    tax_amount: Decimal | None = None,
    line_classification: str | None = "stockable_input",
) -> ValidationLineItemInput:
    return ValidationLineItemInput(
        id=line_id,
        line_order=line_order,
        quantity=quantity,
        unit_price=unit_price,
        line_total=line_total,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        line_classification=line_classification,
    )


def _invoice(
    *,
    invoice_id: str = "inv-1",
    subtotal_amount: Decimal | None = Decimal("100.00"),
    tax_amount: Decimal | None = Decimal("19.00"),
    total_amount: Decimal | None = Decimal("119.00"),
) -> ValidationInvoiceInput:
    return ValidationInvoiceInput(
        id=invoice_id,
        subtotal_amount=subtotal_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )


def _comparison(
    *,
    line_item_id: str = "line-1",
    line_order: int = 1,
    coverage_tier: str = "strong",
    paid: Decimal = Decimal("12.00"),
    reference: Decimal = Decimal("10.00"),
    deviation_pct: Decimal = Decimal("20.00"),
    deviation_amt: Decimal = Decimal("2.00"),
    count: int = 5,
) -> ComparisonAvailable:
    return ComparisonAvailable(
        line_item_id=line_item_id,
        line_order=line_order,
        coverage_tier=coverage_tier,
        benchmark_reference_price=reference,
        benchmark_observation_count=count,
        benchmark_observation_ids=[f"obs-{i}" for i in range(count)],
        benchmark_source_kinds_summary=["invoice"],
        benchmark_window_from="2026-01-01T00:00:00Z",
        benchmark_window_to="2026-03-01T00:00:00Z",
        comparable_basis=ComparableBasis(
            canonical_product_id="prod-1",
            normalized_unit="kg",
            currency="RON",
            ex_vat=True,
        ),
        paid_unit_price=paid,
        deviation_amount=deviation_amt,
        deviation_percent=deviation_pct,
    )


# ---------------------------------------------------------------------------
# Rule 1: Line total consistency
# ---------------------------------------------------------------------------


class TestLineTotalConsistency:
    def test_consistent(self) -> None:
        result = validate_line_total_consistency(
            _line(quantity=Decimal("3"), unit_price=Decimal("10.00"), line_total=Decimal("30.00"))
        )
        assert result.outcome == "pass"
        assert result.reason_code == "consistent"

    def test_inconsistent(self) -> None:
        result = validate_line_total_consistency(
            _line(quantity=Decimal("3"), unit_price=Decimal("10.00"), line_total=Decimal("35.00"))
        )
        assert result.outcome == "warn"
        assert result.reason_code == "inconsistent"

    def test_exactly_at_tolerance(self) -> None:
        # 3 × 10.00 = 30.00; line_total = 30.02; diff = 0.02 = tolerance → pass
        result = validate_line_total_consistency(
            _line(quantity=Decimal("3"), unit_price=Decimal("10.00"), line_total=Decimal("30.02"))
        )
        assert result.outcome == "pass"

    def test_missing_quantity(self) -> None:
        result = validate_line_total_consistency(_line(quantity=None))
        assert result.outcome == "not_evaluable"
        assert result.reason_code == "missing_fields"

    def test_missing_unit_price(self) -> None:
        result = validate_line_total_consistency(_line(unit_price=None))
        assert result.outcome == "not_evaluable"

    def test_missing_line_total(self) -> None:
        result = validate_line_total_consistency(_line(line_total=None))
        assert result.outcome == "not_evaluable"


# ---------------------------------------------------------------------------
# Rule 2: Invoice total mismatch
# ---------------------------------------------------------------------------


class TestInvoiceTotalMismatch:
    def test_matches(self) -> None:
        inv = _invoice(subtotal_amount=Decimal("100.00"))
        lines = [
            _line(line_total=Decimal("60.00")),
            _line(line_id="line-2", line_total=Decimal("40.00")),
        ]
        result = validate_invoice_total_mismatch(inv, lines)
        assert result.outcome == "pass"

    def test_mismatch(self) -> None:
        inv = _invoice(subtotal_amount=Decimal("100.00"))
        lines = [_line(line_total=Decimal("90.00"))]
        result = validate_invoice_total_mismatch(inv, lines)
        assert result.outcome == "warn"
        assert result.reason_code == "mismatch"
        assert result.evidence["difference"] == Decimal("10.00")

    def test_no_invoice_amounts(self) -> None:
        inv = _invoice(subtotal_amount=None, total_amount=None)
        result = validate_invoice_total_mismatch(inv, [_line()])
        assert result.outcome == "not_evaluable"
        assert result.reason_code == "missing_invoice_totals"

    def test_no_line_totals(self) -> None:
        inv = _invoice()
        lines = [_line(line_total=None)]
        result = validate_invoice_total_mismatch(inv, lines)
        assert result.outcome == "not_evaluable"
        assert result.reason_code == "no_line_totals"

    def test_uses_subtotal_over_total(self) -> None:
        inv = _invoice(subtotal_amount=Decimal("50.00"), total_amount=Decimal("59.50"))
        lines = [_line(line_total=Decimal("50.00"))]
        result = validate_invoice_total_mismatch(inv, lines)
        assert result.outcome == "pass"
        assert result.evidence["compare_field"] == "subtotal_amount"


# ---------------------------------------------------------------------------
# Rule 3: Suspicious unit price
# ---------------------------------------------------------------------------


class TestSuspiciousUnitPrice:
    def test_strong_above_threshold(self) -> None:
        # 25% deviation > 20% threshold
        br = _comparison(deviation_pct=Decimal("25.00"))
        result = validate_suspicious_unit_price(br)
        assert result.outcome == "warn"
        assert result.reason_code == "above_threshold"

    def test_strong_within_threshold(self) -> None:
        br = _comparison(deviation_pct=Decimal("15.00"))
        result = validate_suspicious_unit_price(br)
        assert result.outcome == "pass"
        assert result.reason_code == "within_threshold"

    def test_weak_coverage(self) -> None:
        br = _comparison(coverage_tier="weak")
        result = validate_suspicious_unit_price(br)
        assert result.outcome == "not_evaluable"
        assert result.reason_code == "weak_benchmark_coverage"

    def test_no_observations(self) -> None:
        br = NoObservationsFound(
            line_item_id="line-1", line_order=1, reason="No observations"
        )
        result = validate_suspicious_unit_price(br)
        assert result.outcome == "not_evaluable"
        assert result.reason_code == "no_observations_found"

    def test_not_benchmark_eligible(self) -> None:
        br = NotBenchmarkEligible(
            line_item_id="line-1", line_order=1, reason="Service line"
        )
        result = validate_suspicious_unit_price(br)
        assert result.outcome == "not_evaluable"
        assert result.reason_code == "not_benchmark_eligible"


# ---------------------------------------------------------------------------
# Rule 4: Abnormal values
# ---------------------------------------------------------------------------


class TestAbnormalValues:
    def test_negative_quantity_non_discount(self) -> None:
        results = validate_abnormal_values(
            _line(quantity=Decimal("-5"), line_classification="stockable_input")
        )
        assert len(results) == 1
        assert results[0].rule_key == "abnormal_negative_quantity"

    def test_negative_quantity_discount_skipped(self) -> None:
        results = validate_abnormal_values(
            _line(quantity=Decimal("-5"), line_classification="discount_adjustment")
        )
        assert results == []

    def test_zero_unit_price(self) -> None:
        results = validate_abnormal_values(
            _line(unit_price=Decimal("0"), line_total=Decimal("50.00"))
        )
        assert any(r.rule_key == "abnormal_unit_price" for r in results)

    def test_negative_line_total(self) -> None:
        results = validate_abnormal_values(
            _line(line_total=Decimal("-10.00"))
        )
        assert any(r.rule_key == "abnormal_line_total" for r in results)

    def test_none_quantity_no_result(self) -> None:
        results = validate_abnormal_values(_line(quantity=None))
        assert not any(r.rule_key == "abnormal_negative_quantity" for r in results)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


class TestSummary:
    def test_counts(self) -> None:
        from farm_copilot.domain.invoice_validation import InvoiceValidationResult

        results = [
            InvoiceValidationResult(
                rule_key="r1", subject_type="invoice", subject_id="x",
                outcome="pass", reason_code="ok", reason="ok",
                blocking=False, evidence={},
            ),
            InvoiceValidationResult(
                rule_key="r2", subject_type="invoice", subject_id="x",
                outcome="warn", reason_code="w", reason="w",
                blocking=False, evidence={},
            ),
            InvoiceValidationResult(
                rule_key="r3", subject_type="invoice", subject_id="x",
                outcome="not_evaluable", reason_code="n", reason="n",
                blocking=False, evidence={},
            ),
        ]
        summary = summarize_validation_results(results)
        assert summary == InvoiceValidationSummary(
            total_rules=3, pass_count=1, warn=1, fail=0,
            not_evaluable=1, has_blocking_findings=False,
        )

    def test_blocking(self) -> None:
        from farm_copilot.domain.invoice_validation import InvoiceValidationResult

        results = [
            InvoiceValidationResult(
                rule_key="r1", subject_type="invoice", subject_id="x",
                outcome="fail", reason_code="blocked", reason="blocked",
                blocking=True, evidence={},
            ),
        ]
        summary = summarize_validation_results(results)
        assert summary.has_blocking_findings is True


# ---------------------------------------------------------------------------
# End-to-end
# ---------------------------------------------------------------------------


class TestRunInvoiceValidation:
    def test_full_run(self) -> None:
        inv = _invoice(subtotal_amount=Decimal("50.00"))
        lines = [
            _line(
                line_id="L1",
                quantity=Decimal("5"),
                unit_price=Decimal("10.00"),
                line_total=Decimal("50.00"),
            ),
        ]
        br = _comparison(
            line_item_id="L1",
            coverage_tier="strong",
            deviation_pct=Decimal("25.00"),
        )
        validation_input = RunInvoiceValidationInput(
            invoice=inv, line_items=lines, benchmark_results=[br]
        )
        results, summary = run_invoice_validation(validation_input)

        # Should have: 1 line_total_consistency + 0 abnormal + 1 invoice_total + 1 suspicious
        assert summary.total_rules == 3
        rule_keys = [r.rule_key for r in results]
        assert "line_total_consistency" in rule_keys
        assert "invoice_total_mismatch" in rule_keys
        assert "suspicious_unit_price" in rule_keys
