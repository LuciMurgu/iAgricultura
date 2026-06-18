"""Explanation derivation — structured explanations for every surfaced alert.

Generates a 1:1 mapping from alerts to machine-usable explanations.
This module does NOT decide what is important (that is the alert layer's job).
It only translates alert evidence into human-readable structured explanations.

Key design advantage: because alert_derivation.py uses typed evidence
dataclasses (DEC-0007), this module reads evidence fields via isinstance()
checks and direct attribute access — no string key lookups, no silent None
on renames.

Pure domain logic: only stdlib + domain imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from .alert_derivation import (
    ConfirmedDuplicateEvidence,
    DuplicateCandidateSummary,
    InvoiceAlert,
    InvoiceTotalMismatchEvidence,
    PossibleDuplicateEvidence,
    SuspiciousOverpaymentEvidence,
)

# ---------------------------------------------------------------------------
# Explanation kind / support strength
# ---------------------------------------------------------------------------

ExplanationKind = Literal[
    "suspicious_overpayment",
    "confirmed_duplicate_invoice",
    "possible_duplicate_invoice",
    "invoice_total_mismatch",
]

SupportStrength = Literal["strong", "medium", "weak", "none"]

# ---------------------------------------------------------------------------
# Data-used breakdown
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ExplanationDataUsed:
    """Structured breakdown of data used to reach the conclusion."""

    validation_rule_key: str | None = None
    validation_outcome: str | None = None
    benchmark_coverage_tier: str | None = None
    benchmark_observation_count: int | None = None
    benchmark_reference_price: Decimal | None = None
    paid_unit_price: Decimal | None = None
    deviation_amount: Decimal | None = None
    deviation_percent: Decimal | None = None
    threshold_percent: Decimal | None = None
    sum_line_totals: Decimal | None = None
    invoice_header_total: Decimal | None = None
    total_difference: Decimal | None = None
    invoice_reference_field: str | None = None
    duplicate_candidate_count: int | None = None
    duplicate_candidate_ids: list[str] | None = None
    duplicate_match_criteria: list[str] | None = None
    duplicate_likelihood: str | None = None


# ---------------------------------------------------------------------------
# Source reference sub-types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BenchmarkContextRef:
    coverage_tier: str
    observation_count: int
    window_from: str | None = None
    window_to: str | None = None
    observation_ids: list[str] | None = None
    source_kinds_summary: list[str] | None = None


@dataclass(frozen=True)
class DuplicateEvidenceSummaryRef:
    strong_match_count: int
    possible_match_count: int
    candidates: list[dict[str, object]] = field(default_factory=list)


@dataclass(frozen=True)
class ExplanationSourceReferences:
    invoice_id: str
    line_item_id: str | None = None
    line_order: int | None = None
    validation_result_key: str | None = None
    benchmark_context: BenchmarkContextRef | None = None
    duplicate_evidence_summary: DuplicateEvidenceSummaryRef | None = None
    stock_impact: str = "deferred"


# ---------------------------------------------------------------------------
# Main explanation type
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class InvoiceExplanation:
    explanation_kind: ExplanationKind
    source_alert_key: str
    subject_type: str  # "invoice" | "invoice_line_item"
    subject_id: str
    line_order: int | None
    what_happened: str
    data_used: ExplanationDataUsed
    why_it_matters: str
    support_strength: SupportStrength
    next_action: str
    source_references: ExplanationSourceReferences


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ExplanationCountsByKind:
    suspicious_overpayment: int = 0
    confirmed_duplicate_invoice: int = 0
    possible_duplicate_invoice: int = 0
    invoice_total_mismatch: int = 0


@dataclass(frozen=True)
class ExplanationCounts:
    total: int
    by_kind: ExplanationCountsByKind


@dataclass(frozen=True)
class InvoiceExplanationsResult:
    invoice_id: str
    farm_id: str
    explanations: list[InvoiceExplanation] = field(default_factory=list)
    counts: ExplanationCounts = field(
        default_factory=lambda: ExplanationCounts(
            total=0,
            by_kind=ExplanationCountsByKind(),
        )
    )


# ---------------------------------------------------------------------------
# Input type
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DeriveInvoiceExplanationsInput:
    invoice_id: str
    farm_id: str
    alerts: list[InvoiceAlert]


# ---------------------------------------------------------------------------
# Private builders — one per alert kind
# ---------------------------------------------------------------------------


def _build_overpayment_explanation(
    invoice_id: str,
    alert: InvoiceAlert,
) -> InvoiceExplanation:
    """Build explanation for suspicious_overpayment alert.

    Reads evidence via isinstance(alert.evidence, SuspiciousOverpaymentEvidence).
    """
    assert isinstance(alert.evidence, SuspiciousOverpaymentEvidence)
    ev = alert.evidence

    support: SupportStrength = (
        "strong" if ev.coverage_tier == "strong"
        else "weak" if ev.coverage_tier == "weak"
        else "none"
    )

    return InvoiceExplanation(
        explanation_kind="suspicious_overpayment",
        source_alert_key="suspicious_overpayment",
        subject_type="invoice_line_item",
        subject_id=alert.subject_id,
        line_order=ev.line_order,
        what_happened=(
            f"Unit price on this line is {ev.deviation_percent}% above the "
            f"benchmark reference price ({ev.benchmark_reference_price}) "
            f"based on {ev.benchmark_observation_count} comparable observations."
        ),
        data_used=ExplanationDataUsed(
            validation_rule_key=ev.validation_rule_key,
            validation_outcome=ev.validation_outcome,
            benchmark_coverage_tier=ev.coverage_tier,
            benchmark_observation_count=ev.benchmark_observation_count,
            benchmark_reference_price=ev.benchmark_reference_price,
            paid_unit_price=ev.paid_unit_price,
            deviation_amount=ev.deviation_amount,
            deviation_percent=ev.deviation_percent,
            threshold_percent=ev.threshold_percent,
        ),
        why_it_matters=(
            "Paying above the benchmark reference may indicate an invoice "
            "error or a price negotiation that has not been captured in the "
            "system."
        ),
        support_strength=support,
        next_action=alert.recommended_action,
        source_references=ExplanationSourceReferences(
            invoice_id=invoice_id,
            line_item_id=alert.subject_id,
            line_order=ev.line_order,
            validation_result_key="suspicious_unit_price",
            benchmark_context=BenchmarkContextRef(
                coverage_tier=ev.coverage_tier,
                observation_count=ev.benchmark_observation_count,
                window_from=ev.benchmark_window_from,
                window_to=ev.benchmark_window_to,
                observation_ids=ev.benchmark_observation_ids,
                source_kinds_summary=ev.benchmark_source_kinds_summary,
            ),
        ),
    )


def _candidate_summary_to_dict(c: DuplicateCandidateSummary) -> dict[str, object]:
    """Convert a DuplicateCandidateSummary to a dict for source references."""
    return {
        "candidate_invoice_id": c.candidate_invoice_id,
        "likelihood": c.likelihood,
        "reason_codes": list(c.reason_codes),
    }


def _build_confirmed_duplicate_explanation(
    invoice_id: str,
    alert: InvoiceAlert,
) -> InvoiceExplanation:
    """Build explanation for confirmed_duplicate_invoice alert.

    Reads evidence via isinstance(alert.evidence, ConfirmedDuplicateEvidence).
    """
    assert isinstance(alert.evidence, ConfirmedDuplicateEvidence)
    ev = alert.evidence

    match_criteria: list[str] = list(
        dict.fromkeys(
            code
            for c in ev.candidate_summary
            for code in c.reason_codes
        )
    )

    return InvoiceExplanation(
        explanation_kind="confirmed_duplicate_invoice",
        source_alert_key="confirmed_duplicate_invoice",
        subject_type="invoice",
        subject_id=invoice_id,
        line_order=None,
        what_happened=(
            f"This invoice matches {ev.strong_match_count} previously "
            f"processed invoice(s) on strong criteria: "
            f"{', '.join(match_criteria) or 'see candidate summary'}."
        ),
        data_used=ExplanationDataUsed(
            duplicate_candidate_count=len(ev.candidate_summary),
            duplicate_candidate_ids=ev.candidate_invoice_ids,
            duplicate_match_criteria=match_criteria,
            duplicate_likelihood="strong",
        ),
        why_it_matters=(
            "A strong duplicate match means this invoice may already have "
            "been paid and stock-in movements blocked. Accepting it without "
            "review risks double-payment or duplicate stock."
        ),
        support_strength="strong",
        next_action=alert.recommended_action,
        source_references=ExplanationSourceReferences(
            invoice_id=invoice_id,
            validation_result_key="duplicate_invoice_suspicion",
            duplicate_evidence_summary=DuplicateEvidenceSummaryRef(
                strong_match_count=ev.strong_match_count,
                possible_match_count=ev.possible_match_count,
                candidates=[
                    _candidate_summary_to_dict(c)
                    for c in ev.candidate_summary
                ],
            ),
        ),
    )


def _build_possible_duplicate_explanation(
    invoice_id: str,
    alert: InvoiceAlert,
) -> InvoiceExplanation:
    """Build explanation for possible_duplicate_invoice alert.

    Reads evidence via isinstance(alert.evidence, PossibleDuplicateEvidence).
    """
    assert isinstance(alert.evidence, PossibleDuplicateEvidence)
    ev = alert.evidence

    match_criteria: list[str] = list(
        dict.fromkeys(
            code
            for c in ev.candidate_summary
            for code in c.reason_codes
        )
    )

    return InvoiceExplanation(
        explanation_kind="possible_duplicate_invoice",
        source_alert_key="possible_duplicate_invoice",
        subject_type="invoice",
        subject_id=invoice_id,
        line_order=None,
        what_happened=(
            f"This invoice shares partial criteria with "
            f"{ev.possible_match_count} other invoice(s): "
            f"{', '.join(match_criteria) or 'see candidate summary'}. "
            f"Evidence is not conclusive."
        ),
        data_used=ExplanationDataUsed(
            duplicate_candidate_count=len(ev.candidate_summary),
            duplicate_candidate_ids=ev.candidate_invoice_ids,
            duplicate_match_criteria=match_criteria,
            duplicate_likelihood="possible",
        ),
        why_it_matters=(
            "A possible duplicate cannot be automatically rejected but "
            "should be verified before finalizing payment."
        ),
        support_strength="medium",
        next_action=alert.recommended_action,
        source_references=ExplanationSourceReferences(
            invoice_id=invoice_id,
            validation_result_key="duplicate_invoice_suspicion",
            duplicate_evidence_summary=DuplicateEvidenceSummaryRef(
                strong_match_count=0,
                possible_match_count=ev.possible_match_count,
                candidates=[
                    _candidate_summary_to_dict(c)
                    for c in ev.candidate_summary
                ],
            ),
        ),
    )


def _build_total_mismatch_explanation(
    invoice_id: str,
    alert: InvoiceAlert,
) -> InvoiceExplanation:
    """Build explanation for invoice_total_mismatch alert.

    Reads evidence via isinstance(alert.evidence, InvoiceTotalMismatchEvidence).
    """
    assert isinstance(alert.evidence, InvoiceTotalMismatchEvidence)
    ev = alert.evidence

    return InvoiceExplanation(
        explanation_kind="invoice_total_mismatch",
        source_alert_key="invoice_total_mismatch",
        subject_type="invoice",
        subject_id=invoice_id,
        line_order=None,
        what_happened=(
            f"Sum of line totals ({ev.sum_line_totals}) does not match the "
            f"invoice {ev.invoice_reference_field} ({ev.invoice_reference}). "
            f"Difference: {ev.difference}."
        ),
        data_used=ExplanationDataUsed(
            validation_rule_key=ev.validation_rule_key,
            validation_outcome=ev.validation_outcome,
            sum_line_totals=ev.sum_line_totals,
            invoice_header_total=ev.invoice_reference,
            total_difference=ev.difference,
            invoice_reference_field=ev.invoice_reference_field,
        ),
        why_it_matters=(
            "A mismatch between line-level totals and the invoice header "
            "suggests a calculation error, a missing line, or an incorrect "
            "header. The invoice total reported to the tax authority may "
            "differ from what was negotiated."
        ),
        support_strength="strong",
        next_action=alert.recommended_action,
        source_references=ExplanationSourceReferences(
            invoice_id=invoice_id,
            validation_result_key="invoice_total_mismatch",
        ),
    )


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

_BUILDERS = {
    "suspicious_overpayment": _build_overpayment_explanation,
    "confirmed_duplicate_invoice": _build_confirmed_duplicate_explanation,
    "possible_duplicate_invoice": _build_possible_duplicate_explanation,
    "invoice_total_mismatch": _build_total_mismatch_explanation,
}


# ---------------------------------------------------------------------------
# Result builder
# ---------------------------------------------------------------------------


def _build_result(
    invoice_id: str,
    farm_id: str,
    explanations: list[InvoiceExplanation],
) -> InvoiceExplanationsResult:
    """Aggregate counts by kind. All 4 kinds initialized to 0."""
    by_kind = ExplanationCountsByKind(
        suspicious_overpayment=sum(
            1 for e in explanations
            if e.explanation_kind == "suspicious_overpayment"
        ),
        confirmed_duplicate_invoice=sum(
            1 for e in explanations
            if e.explanation_kind == "confirmed_duplicate_invoice"
        ),
        possible_duplicate_invoice=sum(
            1 for e in explanations
            if e.explanation_kind == "possible_duplicate_invoice"
        ),
        invoice_total_mismatch=sum(
            1 for e in explanations
            if e.explanation_kind == "invoice_total_mismatch"
        ),
    )

    return InvoiceExplanationsResult(
        invoice_id=invoice_id,
        farm_id=farm_id,
        explanations=explanations,
        counts=ExplanationCounts(
            total=len(explanations),
            by_kind=by_kind,
        ),
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def derive_invoice_explanations(
    explanation_input: DeriveInvoiceExplanationsInput,
) -> InvoiceExplanationsResult:
    """Derive structured explanations for every surfaced alert.

    1:1 mapping — one explanation per alert. Order follows alerts order.
    This function does not decide which findings are important — that is
    the alert layer's responsibility.
    """
    explanations: list[InvoiceExplanation] = []

    for alert in explanation_input.alerts:
        builder = _BUILDERS.get(alert.alert_key)
        if builder is not None:
            explanations.append(
                builder(explanation_input.invoice_id, alert)
            )

    return _build_result(
        explanation_input.invoice_id,
        explanation_input.farm_id,
        explanations,
    )
