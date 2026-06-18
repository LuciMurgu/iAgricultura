"""Tests for farm_copilot.domain.duplicate_suspicion."""

from decimal import Decimal

from farm_copilot.domain.duplicate_suspicion import (
    DuplicateSuspicionCandidateInput,
    DuplicateSuspicionTargetInput,
    evaluate_candidate_evidence,
    normalize_invoice_number,
    resolve_duplicate_suspicion,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _target(
    *,
    target_id: str = "inv-target",
    supplier_id: str | None = "sup-1",
    invoice_number: str | None = "F-2024/001",
    invoice_date: str | None = "2026-03-15",
    total_amount: Decimal | None = Decimal("1000.00"),
    uploaded_document_id: str = "doc-1",
) -> DuplicateSuspicionTargetInput:
    return DuplicateSuspicionTargetInput(
        id=target_id,
        supplier_id=supplier_id,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        total_amount=total_amount,
        uploaded_document_id=uploaded_document_id,
    )


def _candidate(
    *,
    candidate_id: str = "inv-candidate",
    supplier_id: str | None = "sup-1",
    invoice_number: str | None = "F-2024/001",
    invoice_date: str | None = "2026-03-15",
    total_amount: Decimal | None = Decimal("1000.00"),
    uploaded_document_id: str = "doc-2",
) -> DuplicateSuspicionCandidateInput:
    return DuplicateSuspicionCandidateInput(
        id=candidate_id,
        supplier_id=supplier_id,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        total_amount=total_amount,
        uploaded_document_id=uploaded_document_id,
    )


# ---------------------------------------------------------------------------
# normalize_invoice_number
# ---------------------------------------------------------------------------


class TestNormalizeInvoiceNumber:
    def test_none_returns_none(self) -> None:
        assert normalize_invoice_number(None) is None

    def test_empty_returns_none(self) -> None:
        assert normalize_invoice_number("") is None
        assert normalize_invoice_number("   ") is None

    def test_strips_dashes_slashes_dots_spaces_hash(self) -> None:
        assert normalize_invoice_number("F-2024/001") == "F2024001"
        assert normalize_invoice_number("INV.2024.001") == "INV2024001"
        assert normalize_invoice_number("#123 456") == "123456"

    def test_uppercases(self) -> None:
        assert normalize_invoice_number("abc-123") == "ABC123"


# ---------------------------------------------------------------------------
# Evidence hierarchy
# ---------------------------------------------------------------------------


class TestSameUploadedDocument:
    def test_same_uploaded_document_strong(self) -> None:
        target = _target(uploaded_document_id="doc-SAME")
        candidate = _candidate(uploaded_document_id="doc-SAME")
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.likelihood == "strong"
        assert "same_uploaded_document" in evidence.reason_codes


class TestSameSupplierSameInvoiceNumber:
    def test_strong(self) -> None:
        evidence = evaluate_candidate_evidence(_target(), _candidate())
        assert evidence.likelihood == "strong"
        assert "same_supplier_same_invoice_number" in evidence.reason_codes

    def test_normalized_match(self) -> None:
        """F-2024/001 vs F2024001 should normalize to the same thing."""
        target = _target(invoice_number="F-2024/001")
        candidate = _candidate(invoice_number="F2024001")
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.normalized_invoice_number_match is True
        assert evidence.likelihood == "strong"


class TestCrossSupplierInvoiceNumber:
    def test_none_not_suspicious(self) -> None:
        target = _target(supplier_id="sup-1")
        candidate = _candidate(supplier_id="sup-OTHER")
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.likelihood == "none"
        assert "cross_supplier_invoice_number" in evidence.reason_codes


class TestSameSupplierSameDateSameTotal:
    def test_possible(self) -> None:
        target = _target(invoice_number=None)
        candidate = _candidate(invoice_number=None)
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.likelihood == "possible"
        assert "same_supplier_same_date_same_total" in evidence.reason_codes

    def test_different_total_none(self) -> None:
        target = _target(invoice_number=None, total_amount=Decimal("1000.00"))
        candidate = _candidate(invoice_number=None, total_amount=Decimal("500.00"))
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.likelihood == "none"

    def test_different_date_none(self) -> None:
        target = _target(invoice_number=None, invoice_date="2026-03-15")
        candidate = _candidate(invoice_number=None, invoice_date="2026-04-01")
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.likelihood == "none"


# ---------------------------------------------------------------------------
# resolve_duplicate_suspicion
# ---------------------------------------------------------------------------


class TestResolveDuplicateSuspicion:
    def test_no_candidates_pass(self) -> None:
        result = resolve_duplicate_suspicion(_target(), [])
        assert result.outcome == "pass"
        assert result.evaluated is True

    def test_not_evaluable_no_number_no_total(self) -> None:
        target = _target(invoice_number=None, total_amount=None)
        result = resolve_duplicate_suspicion(target, [_candidate()])
        assert result.outcome == "not_evaluable"
        assert result.evaluated is False

    def test_strong_blocking(self) -> None:
        result = resolve_duplicate_suspicion(_target(), [_candidate()])
        assert result.outcome == "fail"
        assert result.blocking is True
        assert result.strong_match_count == 1

    def test_possible_not_blocking(self) -> None:
        target = _target(invoice_number=None)
        candidate = _candidate(invoice_number=None)
        result = resolve_duplicate_suspicion(target, [candidate])
        assert result.outcome == "warn"
        assert result.blocking is False
        assert result.possible_match_count == 1

    def test_multiple_candidates_mixed(self) -> None:
        target = _target()
        candidates = [
            _candidate(candidate_id="c1"),  # strong (same supplier + inv number)
            _candidate(candidate_id="c2", supplier_id="sup-OTHER"),  # none (cross-supplier)
        ]
        result = resolve_duplicate_suspicion(target, candidates)
        assert result.strong_match_count == 1
        assert result.possible_match_count == 0
        assert len(result.candidates) == 1  # only non-"none" included


# ---------------------------------------------------------------------------
# Amount tolerance + date delta
# ---------------------------------------------------------------------------


class TestAmountAndDate:
    def test_total_within_tolerance(self) -> None:
        target = _target(total_amount=Decimal("100.00"))
        candidate = _candidate(total_amount=Decimal("100.01"))
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.total_amount_match is True

    def test_total_outside_tolerance(self) -> None:
        target = _target(total_amount=Decimal("100.00"))
        candidate = _candidate(total_amount=Decimal("100.10"))
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.total_amount_match is False

    def test_date_delta_calculated(self) -> None:
        target = _target(invoice_date="2026-03-10")
        candidate = _candidate(invoice_date="2026-03-15")
        evidence = evaluate_candidate_evidence(target, candidate)
        assert evidence.invoice_date_delta == 5
