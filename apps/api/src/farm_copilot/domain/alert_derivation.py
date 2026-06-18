"""Alert derivation — sparse, high-value alerts from validation results.

Derives alerts from invoice validation and duplicate suspicion results.
Key architectural improvement: typed evidence dataclasses per alert kind
replace the untyped ``dict[str, unknown]`` from the TypeScript version.

Pure domain logic: only stdlib + domain imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from .duplicate_suspicion import CandidateEvidence, DuplicateSuspicionResult
from .invoice_validation import InvoiceValidationResult

# ---------------------------------------------------------------------------
# Alert keys / severity / confidence
# ---------------------------------------------------------------------------

AlertKey = Literal[
    "suspicious_overpayment",
    "possible_duplicate_invoice",
    "confirmed_duplicate_invoice",
    "invoice_total_mismatch",
]
AlertSeverity = Literal["warning", "critical"]
AlertConfidence = Literal["high", "medium"]

# ---------------------------------------------------------------------------
# Typed evidence dataclasses (one per alert kind)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DuplicateCandidateSummary:
    candidate_invoice_id: str
    likelihood: str
    reason_codes: list[str]
    supplier_match: bool
    normalized_invoice_number_match: bool
    invoice_date_match: bool
    total_amount_match: bool
    uploaded_document_match: bool
    total_amount_delta: Decimal | None


@dataclass(frozen=True)
class ConfirmedDuplicateEvidence:
    strong_match_count: int
    possible_match_count: int
    candidate_invoice_ids: list[str]
    candidate_summary: list[DuplicateCandidateSummary]
    duplicate_suspicion_reason: str


@dataclass(frozen=True)
class PossibleDuplicateEvidence:
    possible_match_count: int
    candidate_invoice_ids: list[str]
    candidate_summary: list[DuplicateCandidateSummary]
    duplicate_suspicion_reason: str


@dataclass(frozen=True)
class InvoiceTotalMismatchEvidence:
    sum_line_totals: Decimal
    invoice_reference: Decimal
    invoice_reference_field: str
    difference: Decimal
    tolerance: Decimal
    lines_evaluated: int
    validation_rule_key: str
    validation_outcome: str


@dataclass(frozen=True)
class SuspiciousOverpaymentEvidence:
    line_order: int
    coverage_tier: str
    benchmark_observation_count: int
    benchmark_observation_ids: list[str]
    benchmark_source_kinds_summary: list[str]
    benchmark_window_from: str
    benchmark_window_to: str
    paid_unit_price: Decimal
    benchmark_reference_price: Decimal
    deviation_amount: Decimal
    deviation_percent: Decimal
    threshold_percent: Decimal
    validation_rule_key: str
    validation_outcome: str


AlertEvidence = (
    ConfirmedDuplicateEvidence
    | PossibleDuplicateEvidence
    | InvoiceTotalMismatchEvidence
    | SuspiciousOverpaymentEvidence
)

# ---------------------------------------------------------------------------
# Alert result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class InvoiceAlert:
    alert_key: AlertKey
    severity: AlertSeverity
    subject_type: Literal["invoice", "invoice_line_item"]
    subject_id: str
    reason_codes: list[str]
    evidence: AlertEvidence
    confidence: AlertConfidence
    recommended_action: str


@dataclass(frozen=True)
class AlertCountsBySeverity:
    warning: int
    critical: int


@dataclass(frozen=True)
class AlertCountsByKey:
    suspicious_overpayment: int
    possible_duplicate_invoice: int
    confirmed_duplicate_invoice: int
    invoice_total_mismatch: int


@dataclass(frozen=True)
class AlertCounts:
    total: int
    by_severity: AlertCountsBySeverity
    by_alert_key: AlertCountsByKey


@dataclass(frozen=True)
class InvoiceAlertsResult:
    invoice_id: str
    farm_id: str
    alerts: list[InvoiceAlert] = field(default_factory=list)
    counts: AlertCounts = field(
        default_factory=lambda: AlertCounts(
            total=0,
            by_severity=AlertCountsBySeverity(warning=0, critical=0),
            by_alert_key=AlertCountsByKey(
                suspicious_overpayment=0,
                possible_duplicate_invoice=0,
                confirmed_duplicate_invoice=0,
                invoice_total_mismatch=0,
            ),
        )
    )


# ---------------------------------------------------------------------------
# Input type
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DeriveInvoiceAlertsInput:
    invoice_id: str
    farm_id: str
    validation_results: list[InvoiceValidationResult]
    duplicate_suspicion: DuplicateSuspicionResult


# ---------------------------------------------------------------------------
# Private helpers — build candidate summaries
# ---------------------------------------------------------------------------


def _build_candidate_summary(
    candidate: CandidateEvidence,
) -> DuplicateCandidateSummary:
    return DuplicateCandidateSummary(
        candidate_invoice_id=candidate.candidate_invoice_id,
        likelihood=candidate.likelihood,
        reason_codes=list(candidate.reason_codes),
        supplier_match=candidate.supplier_match,
        normalized_invoice_number_match=candidate.normalized_invoice_number_match,
        invoice_date_match=candidate.invoice_date_match,
        total_amount_match=candidate.total_amount_match,
        uploaded_document_match=candidate.uploaded_document_match,
        total_amount_delta=candidate.total_amount_delta,
    )


# ---------------------------------------------------------------------------
# Private helpers — alert builders
# ---------------------------------------------------------------------------


def _build_confirmed_duplicate_alert(
    invoice_id: str,
    suspicion: DuplicateSuspicionResult,
) -> InvoiceAlert:
    return InvoiceAlert(
        alert_key="confirmed_duplicate_invoice",
        severity="critical",
        subject_type="invoice",
        subject_id=invoice_id,
        reason_codes=[c.reason_codes[0] for c in suspicion.candidates if c.reason_codes],
        evidence=ConfirmedDuplicateEvidence(
            strong_match_count=suspicion.strong_match_count,
            possible_match_count=suspicion.possible_match_count,
            candidate_invoice_ids=[
                c.candidate_invoice_id for c in suspicion.candidates
            ],
            candidate_summary=[
                _build_candidate_summary(c) for c in suspicion.candidates
            ],
            duplicate_suspicion_reason=suspicion.reason,
        ),
        confidence="high",
        recommended_action="review_duplicate_invoice",
    )


def _build_possible_duplicate_alert(
    invoice_id: str,
    suspicion: DuplicateSuspicionResult,
) -> InvoiceAlert:
    return InvoiceAlert(
        alert_key="possible_duplicate_invoice",
        severity="warning",
        subject_type="invoice",
        subject_id=invoice_id,
        reason_codes=[c.reason_codes[0] for c in suspicion.candidates if c.reason_codes],
        evidence=PossibleDuplicateEvidence(
            possible_match_count=suspicion.possible_match_count,
            candidate_invoice_ids=[
                c.candidate_invoice_id for c in suspicion.candidates
            ],
            candidate_summary=[
                _build_candidate_summary(c) for c in suspicion.candidates
            ],
            duplicate_suspicion_reason=suspicion.reason,
        ),
        confidence="medium",
        recommended_action="verify_duplicate_not_resubmitted",
    )


def _build_invoice_total_mismatch_alert(
    invoice_id: str,
    vr: InvoiceValidationResult,
) -> InvoiceAlert:
    ev = vr.evidence
    return InvoiceAlert(
        alert_key="invoice_total_mismatch",
        severity="warning",
        subject_type="invoice",
        subject_id=invoice_id,
        reason_codes=[vr.reason_code],
        evidence=InvoiceTotalMismatchEvidence(
            sum_line_totals=Decimal(str(ev.get("lines_sum", "0"))),
            invoice_reference=Decimal(str(ev.get("compare_amount", "0"))),
            invoice_reference_field=str(ev.get("compare_field", "")),
            difference=Decimal(str(ev.get("difference", "0"))),
            tolerance=Decimal(str(ev.get("tolerance", "0.02"))),
            lines_evaluated=(
                int(ev.get("lines_evaluated", 0))
                if ev.get("lines_evaluated") is not None
                else 0
            ),
            validation_rule_key=vr.rule_key,
            validation_outcome=vr.outcome,
        ),
        confidence="high",
        recommended_action="verify_invoice_totals",
    )


def _build_suspicious_overpayment_alert(
    vr: InvoiceValidationResult,
) -> InvoiceAlert:
    ev = vr.evidence
    return InvoiceAlert(
        alert_key="suspicious_overpayment",
        severity="warning",
        subject_type="invoice_line_item",
        subject_id=vr.subject_id,
        reason_codes=[vr.reason_code],
        evidence=SuspiciousOverpaymentEvidence(
            line_order=int(ev.get("line_order", 0)) if ev.get("line_order") is not None else 0,
            coverage_tier=str(ev.get("coverage_tier", "")),
            benchmark_observation_count=int(ev.get("observation_count", 0)),
            benchmark_observation_ids=list(ev.get("observation_ids", [])),  # type: ignore[arg-type]
            benchmark_source_kinds_summary=list(ev.get("source_kinds", [])),  # type: ignore[arg-type]
            benchmark_window_from=str(ev.get("window_from", "")),
            benchmark_window_to=str(ev.get("window_to", "")),
            paid_unit_price=Decimal(str(ev.get("paid_price", "0"))),
            benchmark_reference_price=Decimal(str(ev.get("reference_price", "0"))),
            deviation_amount=Decimal(str(ev.get("deviation_amount", "0"))),
            deviation_percent=Decimal(str(ev.get("deviation_percent", "0"))),
            threshold_percent=Decimal(str(ev.get("threshold", "20.00"))),
            validation_rule_key=vr.rule_key,
            validation_outcome=vr.outcome,
        ),
        confidence="high",
        recommended_action="compare_with_market_prices",
    )


# ---------------------------------------------------------------------------
# Counts builder
# ---------------------------------------------------------------------------


def _build_result(
    invoice_id: str,
    farm_id: str,
    alerts: list[InvoiceAlert],
) -> InvoiceAlertsResult:
    w = sum(1 for a in alerts if a.severity == "warning")
    c = sum(1 for a in alerts if a.severity == "critical")

    by_key = AlertCountsByKey(
        suspicious_overpayment=sum(
            1 for a in alerts if a.alert_key == "suspicious_overpayment"
        ),
        possible_duplicate_invoice=sum(
            1 for a in alerts if a.alert_key == "possible_duplicate_invoice"
        ),
        confirmed_duplicate_invoice=sum(
            1 for a in alerts if a.alert_key == "confirmed_duplicate_invoice"
        ),
        invoice_total_mismatch=sum(
            1 for a in alerts if a.alert_key == "invoice_total_mismatch"
        ),
    )

    return InvoiceAlertsResult(
        invoice_id=invoice_id,
        farm_id=farm_id,
        alerts=alerts,
        counts=AlertCounts(
            total=len(alerts),
            by_severity=AlertCountsBySeverity(warning=w, critical=c),
            by_alert_key=by_key,
        ),
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def derive_invoice_alerts(
    alert_input: DeriveInvoiceAlertsInput,
) -> InvoiceAlertsResult:
    """Derive sparse, high-value alerts from validation & duplicate results.

    4 alert derivation rules:
    1. ``confirmed_duplicate_invoice`` — duplicate suspicion blocking
    2. ``possible_duplicate_invoice`` — duplicate suspicion warn
    3. ``invoice_total_mismatch`` — validation rule warn
    4. ``suspicious_overpayment`` — strong-coverage benchmark deviance

    Intentionally excluded (noise): abnormal_values,
    line_total_consistency, not_evaluable, weak coverage.
    """
    alerts: list[InvoiceAlert] = []
    suspicion = alert_input.duplicate_suspicion

    # 1. Confirmed duplicate (blocking)
    if suspicion.blocking:
        alerts.append(
            _build_confirmed_duplicate_alert(alert_input.invoice_id, suspicion)
        )

    # 2. Possible duplicate (warn, not blocking)
    elif suspicion.outcome == "warn" and suspicion.possible_match_count > 0:
        alerts.append(
            _build_possible_duplicate_alert(alert_input.invoice_id, suspicion)
        )

    # 3. Invoice total mismatch
    for vr in alert_input.validation_results:
        if vr.rule_key == "invoice_total_mismatch" and vr.outcome == "warn":
            alerts.append(
                _build_invoice_total_mismatch_alert(
                    alert_input.invoice_id, vr
                )
            )

    # 4. Suspicious overpayment (one per flagged line, strong coverage only)
    for vr in alert_input.validation_results:
        if (
            vr.rule_key == "suspicious_unit_price"
            and vr.outcome == "warn"
            and vr.evidence.get("coverage_tier") == "strong"
        ):
            alerts.append(_build_suspicious_overpayment_alert(vr))

    return _build_result(alert_input.invoice_id, alert_input.farm_id, alerts)
