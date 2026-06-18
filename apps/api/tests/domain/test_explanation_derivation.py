"""Tests for farm_copilot.domain.explanation_derivation."""

from decimal import Decimal

from farm_copilot.domain.alert_derivation import (
    ConfirmedDuplicateEvidence,
    DuplicateCandidateSummary,
    InvoiceAlert,
    InvoiceTotalMismatchEvidence,
    PossibleDuplicateEvidence,
    SuspiciousOverpaymentEvidence,
)
from farm_copilot.domain.explanation_derivation import (
    DeriveInvoiceExplanationsInput,
    derive_invoice_explanations,
)

# ---------------------------------------------------------------------------
# Fixtures — alert builders
# ---------------------------------------------------------------------------


def _overpayment_alert(
    *,
    line_id: str = "line-1",
    line_order: int = 3,
    coverage: str = "strong",
) -> InvoiceAlert:
    return InvoiceAlert(
        alert_key="suspicious_overpayment",
        severity="warning",
        subject_type="invoice_line_item",
        subject_id=line_id,
        reason_codes=["above_benchmark"],
        evidence=SuspiciousOverpaymentEvidence(
            line_order=line_order,
            coverage_tier=coverage,
            benchmark_observation_count=5,
            benchmark_observation_ids=["obs-1", "obs-2"],
            benchmark_source_kinds_summary=["historical"],
            benchmark_window_from="2025-01-01",
            benchmark_window_to="2025-12-31",
            paid_unit_price=Decimal("12.00"),
            benchmark_reference_price=Decimal("8.00"),
            deviation_amount=Decimal("4.00"),
            deviation_percent=Decimal("50.00"),
            threshold_percent=Decimal("20.00"),
            validation_rule_key="suspicious_unit_price",
            validation_outcome="warn",
        ),
        confidence="high",
        recommended_action="compare_with_market_prices",
    )


_CANDIDATE_SUMMARY = DuplicateCandidateSummary(
    candidate_invoice_id="inv-dup",
    likelihood="strong",
    reason_codes=["same_supplier_same_invoice_number"],
    supplier_match=True,
    normalized_invoice_number_match=True,
    invoice_date_match=False,
    total_amount_match=False,
    uploaded_document_match=False,
    total_amount_delta=None,
)

_POSSIBLE_CANDIDATE_SUMMARY = DuplicateCandidateSummary(
    candidate_invoice_id="inv-maybe",
    likelihood="possible",
    reason_codes=["same_supplier_same_date_same_total"],
    supplier_match=True,
    normalized_invoice_number_match=False,
    invoice_date_match=True,
    total_amount_match=True,
    uploaded_document_match=False,
    total_amount_delta=Decimal("0"),
)


def _confirmed_dup_alert() -> InvoiceAlert:
    return InvoiceAlert(
        alert_key="confirmed_duplicate_invoice",
        severity="critical",
        subject_type="invoice",
        subject_id="inv-1",
        reason_codes=["same_supplier_same_invoice_number"],
        evidence=ConfirmedDuplicateEvidence(
            strong_match_count=1,
            possible_match_count=0,
            candidate_invoice_ids=["inv-dup"],
            candidate_summary=[_CANDIDATE_SUMMARY],
            duplicate_suspicion_reason="Found 1 strong duplicate match(es)",
        ),
        confidence="high",
        recommended_action="review_duplicate_invoice",
    )


def _possible_dup_alert() -> InvoiceAlert:
    return InvoiceAlert(
        alert_key="possible_duplicate_invoice",
        severity="warning",
        subject_type="invoice",
        subject_id="inv-1",
        reason_codes=["same_supplier_same_date_same_total"],
        evidence=PossibleDuplicateEvidence(
            possible_match_count=1,
            candidate_invoice_ids=["inv-maybe"],
            candidate_summary=[_POSSIBLE_CANDIDATE_SUMMARY],
            duplicate_suspicion_reason="Found 1 possible duplicate match(es)",
        ),
        confidence="medium",
        recommended_action="verify_duplicate_not_resubmitted",
    )


def _mismatch_alert() -> InvoiceAlert:
    return InvoiceAlert(
        alert_key="invoice_total_mismatch",
        severity="warning",
        subject_type="invoice",
        subject_id="inv-1",
        reason_codes=["total_mismatch"],
        evidence=InvoiceTotalMismatchEvidence(
            sum_line_totals=Decimal("950.00"),
            invoice_reference=Decimal("1000.00"),
            invoice_reference_field="subtotal_amount",
            difference=Decimal("50.00"),
            tolerance=Decimal("0.02"),
            lines_evaluated=5,
            validation_rule_key="invoice_total_mismatch",
            validation_outcome="warn",
        ),
        confidence="high",
        recommended_action="verify_invoice_totals",
    )


def _input(alerts: list[InvoiceAlert] | None = None) -> DeriveInvoiceExplanationsInput:
    return DeriveInvoiceExplanationsInput(
        invoice_id="inv-1",
        farm_id="farm-1",
        alerts=alerts or [],
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestEmptyInput:
    def test_no_alerts_empty_explanations(self) -> None:
        result = derive_invoice_explanations(_input())
        assert result.explanations == []
        assert result.counts.total == 0

    def test_invoice_id_carried_through(self) -> None:
        result = derive_invoice_explanations(_input())
        assert result.invoice_id == "inv-1"

    def test_farm_id_carried_through(self) -> None:
        result = derive_invoice_explanations(_input())
        assert result.farm_id == "farm-1"

    def test_by_kind_defaults_to_zero(self) -> None:
        result = derive_invoice_explanations(_input())
        assert result.counts.by_kind.suspicious_overpayment == 0
        assert result.counts.by_kind.confirmed_duplicate_invoice == 0
        assert result.counts.by_kind.possible_duplicate_invoice == 0
        assert result.counts.by_kind.invoice_total_mismatch == 0


class TestOneToOneMapping:
    def test_n_alerts_n_explanations(self) -> None:
        alerts = [_overpayment_alert(), _confirmed_dup_alert(), _mismatch_alert()]
        result = derive_invoice_explanations(_input(alerts))
        assert len(result.explanations) == 3
        assert result.counts.total == 3

    def test_order_preserved(self) -> None:
        alerts = [_mismatch_alert(), _overpayment_alert(), _confirmed_dup_alert()]
        result = derive_invoice_explanations(_input(alerts))
        kinds = [e.explanation_kind for e in result.explanations]
        assert kinds == [
            "invoice_total_mismatch",
            "suspicious_overpayment",
            "confirmed_duplicate_invoice",
        ]


class TestOverpaymentExplanation:
    def test_what_happened_content(self) -> None:
        result = derive_invoice_explanations(_input([_overpayment_alert()]))
        exp = result.explanations[0]
        assert "50.00%" in exp.what_happened
        assert "8.00" in exp.what_happened
        assert "5" in exp.what_happened

    def test_support_strength_strong(self) -> None:
        result = derive_invoice_explanations(_input([_overpayment_alert(coverage="strong")]))
        assert result.explanations[0].support_strength == "strong"

    def test_support_strength_weak(self) -> None:
        result = derive_invoice_explanations(_input([_overpayment_alert(coverage="weak")]))
        assert result.explanations[0].support_strength == "weak"

    def test_line_order_present(self) -> None:
        result = derive_invoice_explanations(_input([_overpayment_alert(line_order=7)]))
        assert result.explanations[0].line_order == 7

    def test_source_references_benchmark_context(self) -> None:
        result = derive_invoice_explanations(_input([_overpayment_alert()]))
        refs = result.explanations[0].source_references
        assert refs.benchmark_context is not None
        assert refs.benchmark_context.coverage_tier == "strong"
        assert refs.benchmark_context.observation_count == 5
        assert refs.benchmark_context.window_from == "2025-01-01"
        assert refs.benchmark_context.window_to == "2025-12-31"
        assert refs.benchmark_context.observation_ids == ["obs-1", "obs-2"]
        assert refs.benchmark_context.source_kinds_summary == ["historical"]


class TestConfirmedDuplicateExplanation:
    def test_what_happened_content(self) -> None:
        result = derive_invoice_explanations(_input([_confirmed_dup_alert()]))
        exp = result.explanations[0]
        assert "1" in exp.what_happened
        assert "same_supplier_same_invoice_number" in exp.what_happened

    def test_support_strength_strong(self) -> None:
        result = derive_invoice_explanations(_input([_confirmed_dup_alert()]))
        assert result.explanations[0].support_strength == "strong"

    def test_source_references_duplicate_summary(self) -> None:
        result = derive_invoice_explanations(_input([_confirmed_dup_alert()]))
        refs = result.explanations[0].source_references
        assert refs.duplicate_evidence_summary is not None
        assert refs.duplicate_evidence_summary.strong_match_count == 1
        assert len(refs.duplicate_evidence_summary.candidates) == 1


class TestPossibleDuplicateExplanation:
    def test_support_strength_medium(self) -> None:
        result = derive_invoice_explanations(_input([_possible_dup_alert()]))
        assert result.explanations[0].support_strength == "medium"

    def test_what_happened_content(self) -> None:
        result = derive_invoice_explanations(_input([_possible_dup_alert()]))
        exp = result.explanations[0]
        assert "1" in exp.what_happened
        assert "same_supplier_same_date_same_total" in exp.what_happened
        assert "not conclusive" in exp.what_happened


class TestTotalMismatchExplanation:
    def test_what_happened_content(self) -> None:
        result = derive_invoice_explanations(_input([_mismatch_alert()]))
        exp = result.explanations[0]
        assert "950.00" in exp.what_happened
        assert "subtotal_amount" in exp.what_happened
        assert "1000.00" in exp.what_happened
        assert "50.00" in exp.what_happened

    def test_support_strength_strong(self) -> None:
        result = derive_invoice_explanations(_input([_mismatch_alert()]))
        assert result.explanations[0].support_strength == "strong"


class TestLineOrderSemantics:
    def test_line_level_has_line_order(self) -> None:
        result = derive_invoice_explanations(_input([_overpayment_alert(line_order=5)]))
        assert result.explanations[0].line_order == 5
        assert result.explanations[0].line_order is not None

    def test_invoice_level_has_no_line_order(self) -> None:
        result = derive_invoice_explanations(_input([_confirmed_dup_alert()]))
        assert result.explanations[0].line_order is None


class TestCombinedCounts:
    def test_all_four_kinds_counted(self) -> None:
        alerts = [
            _overpayment_alert(),
            _confirmed_dup_alert(),
            _mismatch_alert(),
        ]
        result = derive_invoice_explanations(_input(alerts))
        assert result.counts.total == 3
        assert result.counts.by_kind.suspicious_overpayment == 1
        assert result.counts.by_kind.confirmed_duplicate_invoice == 1
        assert result.counts.by_kind.invoice_total_mismatch == 1
        assert result.counts.by_kind.possible_duplicate_invoice == 0


class TestEvidenceTyping:
    def test_evidence_accessed_via_isinstance(self) -> None:
        """Verify builders use typed evidence — no dict key lookups."""
        alerts = [
            _overpayment_alert(),
            _confirmed_dup_alert(),
            _possible_dup_alert(),
            _mismatch_alert(),
        ]
        result = derive_invoice_explanations(_input(alerts))
        # If builders used dict access, they would have failed on the
        # typed evidence dataclasses. Getting here proves isinstance works.
        assert len(result.explanations) == 4
        for exp in result.explanations:
            assert exp.what_happened  # non-empty
            assert exp.data_used is not None
            assert exp.source_references is not None
