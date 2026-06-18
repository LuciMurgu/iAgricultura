"""Tests for farm_copilot.domain.alert_derivation."""

from decimal import Decimal

from farm_copilot.domain.alert_derivation import (
    ConfirmedDuplicateEvidence,
    DeriveInvoiceAlertsInput,
    InvoiceTotalMismatchEvidence,
    PossibleDuplicateEvidence,
    SuspiciousOverpaymentEvidence,
    derive_invoice_alerts,
)
from farm_copilot.domain.duplicate_suspicion import (
    CandidateEvidence,
    DuplicateSuspicionResult,
)
from farm_copilot.domain.invoice_validation import InvoiceValidationResult

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

NO_DUPLICATE = DuplicateSuspicionResult(
    evaluated=True,
    outcome="pass",
    blocking=False,
    strong_match_count=0,
    possible_match_count=0,
    candidates=[],
    reason="No duplicate suspicion",
)

_CANDIDATE = CandidateEvidence(
    candidate_invoice_id="inv-dup",
    supplier_match=True,
    supplier_mismatch=False,
    normalized_invoice_number_match=True,
    invoice_date_match=False,
    invoice_date_delta=None,
    total_amount_match=False,
    total_amount_delta=None,
    uploaded_document_match=False,
    likelihood="strong",
    reason_codes=["same_supplier_same_invoice_number"],
)

CONFIRMED_DUPLICATE = DuplicateSuspicionResult(
    evaluated=True,
    outcome="fail",
    blocking=True,
    strong_match_count=1,
    possible_match_count=0,
    candidates=[_CANDIDATE],
    reason="Found 1 strong duplicate match(es)",
)

_POSSIBLE_CANDIDATE = CandidateEvidence(
    candidate_invoice_id="inv-maybe",
    supplier_match=True,
    supplier_mismatch=False,
    normalized_invoice_number_match=False,
    invoice_date_match=True,
    invoice_date_delta=0,
    total_amount_match=True,
    total_amount_delta=Decimal("0"),
    uploaded_document_match=False,
    likelihood="possible",
    reason_codes=["same_supplier_same_date_same_total"],
)

POSSIBLE_DUPLICATE = DuplicateSuspicionResult(
    evaluated=True,
    outcome="warn",
    blocking=False,
    strong_match_count=0,
    possible_match_count=1,
    candidates=[_POSSIBLE_CANDIDATE],
    reason="Found 1 possible duplicate match(es)",
)


def _validation_result(
    *,
    rule_key: str = "invoice_total_mismatch",
    outcome: str = "pass",
    evidence: dict[str, object] | None = None,
    subject_id: str = "inv-1",
    subject_type: str = "invoice",
) -> InvoiceValidationResult:
    return InvoiceValidationResult(
        rule_key=rule_key,
        subject_type=subject_type,  # type: ignore[arg-type]
        subject_id=subject_id,
        outcome=outcome,  # type: ignore[arg-type]
        reason_code="test",
        reason="test reason",
        blocking=False,
        evidence=evidence or {},
    )


def _mismatch_warn() -> InvoiceValidationResult:
    return _validation_result(
        rule_key="invoice_total_mismatch",
        outcome="warn",
        evidence={
            "lines_sum": Decimal("950.00"),
            "compare_field": "subtotal_amount",
            "compare_amount": Decimal("1000.00"),
            "difference": Decimal("50.00"),
            "tolerance": Decimal("0.02"),
        },
    )


def _overpayment_warn(
    *, line_id: str = "line-1", coverage: str = "strong"
) -> InvoiceValidationResult:
    return _validation_result(
        rule_key="suspicious_unit_price",
        outcome="warn",
        subject_id=line_id,
        subject_type="invoice_line_item",
        evidence={
            "coverage_tier": coverage,
            "observation_count": 5,
            "observation_ids": ["obs-1", "obs-2"],
            "source_kinds": ["historical"],
            "window_from": "2025-01-01",
            "window_to": "2025-12-31",
            "paid_price": Decimal("12.00"),
            "reference_price": Decimal("8.00"),
            "deviation_amount": Decimal("4.00"),
            "deviation_percent": Decimal("50.00"),
            "threshold": Decimal("20.00"),
        },
    )


def _input(
    *,
    validation_results: list[InvoiceValidationResult] | None = None,
    duplicate_suspicion: DuplicateSuspicionResult | None = None,
) -> DeriveInvoiceAlertsInput:
    return DeriveInvoiceAlertsInput(
        invoice_id="inv-1",
        farm_id="farm-1",
        validation_results=validation_results or [],
        duplicate_suspicion=duplicate_suspicion or NO_DUPLICATE,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestNoAlerts:
    def test_clean(self) -> None:
        result = derive_invoice_alerts(_input())
        assert result.alerts == []
        assert result.counts.total == 0


class TestConfirmedDuplicate:
    def test_critical_alert(self) -> None:
        result = derive_invoice_alerts(
            _input(duplicate_suspicion=CONFIRMED_DUPLICATE)
        )
        assert len(result.alerts) == 1
        alert = result.alerts[0]
        assert alert.alert_key == "confirmed_duplicate_invoice"
        assert alert.severity == "critical"
        assert alert.confidence == "high"
        assert isinstance(alert.evidence, ConfirmedDuplicateEvidence)
        assert alert.evidence.strong_match_count == 1


class TestPossibleDuplicate:
    def test_warning_medium(self) -> None:
        result = derive_invoice_alerts(
            _input(duplicate_suspicion=POSSIBLE_DUPLICATE)
        )
        assert len(result.alerts) == 1
        alert = result.alerts[0]
        assert alert.alert_key == "possible_duplicate_invoice"
        assert alert.severity == "warning"
        assert alert.confidence == "medium"
        assert isinstance(alert.evidence, PossibleDuplicateEvidence)
        assert alert.evidence.possible_match_count == 1


class TestNoDuplicatePass:
    def test_no_alert(self) -> None:
        result = derive_invoice_alerts(
            _input(duplicate_suspicion=NO_DUPLICATE)
        )
        dup_alerts = [
            a for a in result.alerts
            if "duplicate" in a.alert_key
        ]
        assert dup_alerts == []


class TestInvoiceTotalMismatch:
    def test_warn_creates_alert(self) -> None:
        result = derive_invoice_alerts(
            _input(validation_results=[_mismatch_warn()])
        )
        assert len(result.alerts) == 1
        alert = result.alerts[0]
        assert alert.alert_key == "invoice_total_mismatch"
        assert isinstance(alert.evidence, InvoiceTotalMismatchEvidence)
        assert alert.evidence.difference == Decimal("50.00")

    def test_pass_no_alert(self) -> None:
        vr = _validation_result(
            rule_key="invoice_total_mismatch", outcome="pass"
        )
        result = derive_invoice_alerts(_input(validation_results=[vr]))
        assert result.alerts == []


class TestSuspiciousOverpayment:
    def test_strong_coverage_creates_alert(self) -> None:
        result = derive_invoice_alerts(
            _input(validation_results=[_overpayment_warn()])
        )
        assert len(result.alerts) == 1
        alert = result.alerts[0]
        assert alert.alert_key == "suspicious_overpayment"
        assert isinstance(alert.evidence, SuspiciousOverpaymentEvidence)
        assert alert.evidence.deviation_percent == Decimal("50.00")

    def test_weak_coverage_no_alert(self) -> None:
        """Honesty rule — weak coverage → no alert."""
        result = derive_invoice_alerts(
            _input(validation_results=[_overpayment_warn(coverage="weak")])
        )
        assert result.alerts == []

    def test_multiple_lines(self) -> None:
        vrs = [
            _overpayment_warn(line_id="line-1"),
            _overpayment_warn(line_id="line-2"),
        ]
        result = derive_invoice_alerts(_input(validation_results=vrs))
        assert len(result.alerts) == 2


class TestNoiseExclusion:
    def test_abnormal_values_not_surfaced(self) -> None:
        vr = _validation_result(
            rule_key="abnormal_negative_quantity", outcome="warn"
        )
        result = derive_invoice_alerts(_input(validation_results=[vr]))
        assert result.alerts == []

    def test_line_total_consistency_not_surfaced(self) -> None:
        vr = _validation_result(
            rule_key="line_total_consistency", outcome="warn"
        )
        result = derive_invoice_alerts(_input(validation_results=[vr]))
        assert result.alerts == []


class TestCombinedAlerts:
    def test_combined_counts(self) -> None:
        result = derive_invoice_alerts(
            _input(
                validation_results=[
                    _mismatch_warn(),
                    _overpayment_warn(line_id="line-1"),
                ],
                duplicate_suspicion=CONFIRMED_DUPLICATE,
            )
        )
        assert result.counts.total == 3
        assert result.counts.by_severity.critical == 1
        assert result.counts.by_severity.warning == 2
        assert result.counts.by_alert_key.confirmed_duplicate_invoice == 1
        assert result.counts.by_alert_key.invoice_total_mismatch == 1
        assert result.counts.by_alert_key.suspicious_overpayment == 1
        assert result.counts.by_alert_key.possible_duplicate_invoice == 0


class TestEvidenceTyping:
    def test_all_evidence_is_typed(self) -> None:
        """Verify evidence uses typed dataclasses, not dict."""
        result = derive_invoice_alerts(
            _input(
                validation_results=[
                    _mismatch_warn(),
                    _overpayment_warn(),
                ],
                duplicate_suspicion=POSSIBLE_DUPLICATE,
            )
        )
        for alert in result.alerts:
            assert not isinstance(alert.evidence, dict), (
                f"Alert {alert.alert_key} evidence should be typed, got dict"
            )
