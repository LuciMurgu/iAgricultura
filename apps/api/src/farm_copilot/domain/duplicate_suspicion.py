"""Duplicate suspicion — evidence-based duplicate invoice detection.

Compares a target invoice against candidates from the same farm,
producing structured duplicate-likelihood evidence.  Pure domain
logic: only stdlib + ``domain.money``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Literal

from .money import money_abs_diff, money_within_tolerance

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TOTAL_AMOUNT_TOLERANCE = Decimal("0.02")

# ---------------------------------------------------------------------------
# Input types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DuplicateSuspicionTargetInput:
    id: str
    supplier_id: str | None
    invoice_number: str | None
    invoice_date: str | None  # ISO date string
    total_amount: Decimal | None
    uploaded_document_id: str


@dataclass(frozen=True)
class DuplicateSuspicionCandidateInput:
    id: str
    supplier_id: str | None
    invoice_number: str | None
    invoice_date: str | None
    total_amount: Decimal | None
    uploaded_document_id: str


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

DuplicateLikelihood = Literal["strong", "possible", "none"]


@dataclass(frozen=True)
class CandidateEvidence:
    candidate_invoice_id: str
    supplier_match: bool
    supplier_mismatch: bool
    normalized_invoice_number_match: bool
    invoice_date_match: bool
    invoice_date_delta: int | None  # days difference
    total_amount_match: bool
    total_amount_delta: Decimal | None
    uploaded_document_match: bool
    likelihood: DuplicateLikelihood
    reason_codes: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class DuplicateSuspicionResult:
    evaluated: bool
    outcome: Literal["pass", "warn", "fail", "not_evaluable"]
    blocking: bool
    strong_match_count: int
    possible_match_count: int
    candidates: list[CandidateEvidence] = field(default_factory=list)
    reason: str = ""


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

_STRIP_CHARS_RE = re.compile(r"[-/.\s#]")


def normalize_invoice_number(raw: str | None) -> str | None:
    """Strip formatting for comparison.

    - ``None`` or empty → ``None``
    - Uppercase, remove dashes/slashes/dots/spaces/hash
    - Empty result → ``None``
    """
    if raw is None:
        return None
    stripped = raw.strip()
    if not stripped:
        return None
    result = _STRIP_CHARS_RE.sub("", stripped).upper()
    return result if result else None


# ---------------------------------------------------------------------------
# Evidence derivation
# ---------------------------------------------------------------------------


def derive_likelihood(
    *,
    supplier_match: bool,
    supplier_mismatch: bool,
    normalized_invoice_number_match: bool,
    invoice_date_match: bool,
    total_amount_match: bool,
    uploaded_document_match: bool,
) -> tuple[DuplicateLikelihood, list[str]]:
    """Derive duplicate likelihood from evidence flags.

    Evidence hierarchy (first match wins):

    1. Same uploaded document → **strong**
    2. Same supplier + same invoice number → **strong**
    3. Same invoice number + different supplier → **none** (not suspicious)
    4. Same supplier + same date + same total → **possible**
    5. Otherwise → **none**
    """
    if uploaded_document_match:
        return "strong", ["same_uploaded_document"]

    if supplier_match and normalized_invoice_number_match:
        return "strong", ["same_supplier_same_invoice_number"]

    if normalized_invoice_number_match and supplier_mismatch:
        return "none", ["cross_supplier_invoice_number"]

    if supplier_match and invoice_date_match and total_amount_match:
        return "possible", ["same_supplier_same_date_same_total"]

    return "none", []


def evaluate_candidate_evidence(
    target: DuplicateSuspicionTargetInput,
    candidate: DuplicateSuspicionCandidateInput,
) -> CandidateEvidence:
    """Compare *target* against one *candidate* and produce evidence."""
    # Supplier
    supplier_match = (
        target.supplier_id is not None
        and candidate.supplier_id is not None
        and target.supplier_id == candidate.supplier_id
    )
    supplier_mismatch = (
        target.supplier_id is not None
        and candidate.supplier_id is not None
        and target.supplier_id != candidate.supplier_id
    )

    # Invoice number (normalized)
    norm_target = normalize_invoice_number(target.invoice_number)
    norm_candidate = normalize_invoice_number(candidate.invoice_number)
    invoice_number_match = (
        norm_target is not None
        and norm_candidate is not None
        and norm_target == norm_candidate
    )

    # Invoice date
    invoice_date_match = (
        target.invoice_date is not None
        and candidate.invoice_date is not None
        and target.invoice_date == candidate.invoice_date
    )
    invoice_date_delta: int | None = None
    if target.invoice_date is not None and candidate.invoice_date is not None:
        try:
            d_target = date.fromisoformat(target.invoice_date)
            d_candidate = date.fromisoformat(candidate.invoice_date)
            invoice_date_delta = abs((d_target - d_candidate).days)
        except ValueError:
            pass

    # Total amount
    total_amount_match = False
    total_amount_delta: Decimal | None = None
    if target.total_amount is not None and candidate.total_amount is not None:
        total_amount_match = money_within_tolerance(
            target.total_amount, candidate.total_amount, TOTAL_AMOUNT_TOLERANCE
        )
        total_amount_delta = money_abs_diff(target.total_amount, candidate.total_amount)

    # Uploaded document
    uploaded_document_match = (
        target.uploaded_document_id == candidate.uploaded_document_id
    )

    # Derive likelihood
    likelihood, reason_codes = derive_likelihood(
        supplier_match=supplier_match,
        supplier_mismatch=supplier_mismatch,
        normalized_invoice_number_match=invoice_number_match,
        invoice_date_match=invoice_date_match,
        total_amount_match=total_amount_match,
        uploaded_document_match=uploaded_document_match,
    )

    return CandidateEvidence(
        candidate_invoice_id=candidate.id,
        supplier_match=supplier_match,
        supplier_mismatch=supplier_mismatch,
        normalized_invoice_number_match=invoice_number_match,
        invoice_date_match=invoice_date_match,
        invoice_date_delta=invoice_date_delta,
        total_amount_match=total_amount_match,
        total_amount_delta=total_amount_delta,
        uploaded_document_match=uploaded_document_match,
        likelihood=likelihood,
        reason_codes=reason_codes,
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def resolve_duplicate_suspicion(
    target: DuplicateSuspicionTargetInput,
    candidates: list[DuplicateSuspicionCandidateInput],
) -> DuplicateSuspicionResult:
    """Evaluate *target* against *candidates* for duplicate suspicion."""
    # Not evaluable if target has neither invoice_number nor total_amount
    if target.invoice_number is None and target.total_amount is None:
        return DuplicateSuspicionResult(
            evaluated=False,
            outcome="not_evaluable",
            blocking=False,
            strong_match_count=0,
            possible_match_count=0,
            reason="Target has neither invoice_number nor total_amount",
        )

    # No candidates → pass
    if not candidates:
        return DuplicateSuspicionResult(
            evaluated=True,
            outcome="pass",
            blocking=False,
            strong_match_count=0,
            possible_match_count=0,
            reason="No candidates to compare against",
        )

    # Evaluate each candidate
    all_evidence = [
        evaluate_candidate_evidence(target, c) for c in candidates
    ]

    # Filter to non-"none" likelihood
    suspicious = [e for e in all_evidence if e.likelihood != "none"]
    strong_count = sum(1 for e in suspicious if e.likelihood == "strong")
    possible_count = sum(1 for e in suspicious if e.likelihood == "possible")

    if strong_count > 0:
        return DuplicateSuspicionResult(
            evaluated=True,
            outcome="fail",
            blocking=True,
            strong_match_count=strong_count,
            possible_match_count=possible_count,
            candidates=suspicious,
            reason=f"Found {strong_count} strong duplicate match(es)",
        )

    if possible_count > 0:
        return DuplicateSuspicionResult(
            evaluated=True,
            outcome="warn",
            blocking=False,
            strong_match_count=0,
            possible_match_count=possible_count,
            candidates=suspicious,
            reason=f"Found {possible_count} possible duplicate match(es)",
        )

    return DuplicateSuspicionResult(
        evaluated=True,
        outcome="pass",
        blocking=False,
        strong_match_count=0,
        possible_match_count=0,
        candidates=[],
        reason="No duplicate suspicion",
    )
