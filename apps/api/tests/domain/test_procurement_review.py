"""Tests for domain/procurement_review.py — pure domain, no DB.

Tests:
1. Alert-to-issue mapping (each alert key)
2. Product match uncertainty generation
3. Missing stock evidence generation
4. Category uncertainty generation
5. Empty state
6. Safe language
7. Severity ordering
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from farm_copilot.domain.procurement_review import (
    PROCUREMENT_REVIEW_DISCLAIMER,
    ProcurementReviewInput,
    ReviewAlert,
    ReviewInvoiceLine,
    derive_procurement_review,
)

# ---------------------------------------------------------------------------
# Unsafe phrase set — these must NEVER appear in generated text
# ---------------------------------------------------------------------------

UNSAFE_PHRASES = [
    "supplier is wrong",
    "fraud detected",
    "guaranteed savings",
    "guaranteed overpayment",
    "tax advice",
    "legal conclusion",
    "accounting judgement",
    "recover money now",
    "dispute immediately",
    "final accounting judgement",
    "final tax judgement",
]


def _make_alert(
    *,
    alert_key: str = "suspicious_overpayment",
    severity: str = "warning",
    invoice_number: str | None = "FC-001",
    evidence: dict[str, object] | None = None,
) -> ReviewAlert:
    return ReviewAlert(
        alert_id="alert-1",
        invoice_id="inv-1",
        invoice_number=invoice_number,
        alert_key=alert_key,
        severity=severity,
        subject_type="invoice_line_item",
        subject_id="line-1",
        reason_codes=["price_above_benchmark"],
        evidence=evidence or {
            "paid_price": "150.00",
            "reference_price": "120.00",
            "deviation_percent": "25.00",
            "coverage_tier": "strong",
        },
        confidence="high",
        recommended_action="compare_with_market_prices",
    )


def _make_line(
    *,
    line_item_id: str = "line-1",
    canonical_product_id: str | None = None,
    normalization_confidence: Decimal | None = None,
    line_classification: str | None = "stockable_input",
    has_stock_movement: bool = True,
    raw_description: str | None = "Erbicid Roundup 5L",
) -> ReviewInvoiceLine:
    return ReviewInvoiceLine(
        line_item_id=line_item_id,
        invoice_id="inv-1",
        invoice_number="FC-001",
        invoice_date="2026-01-15",
        supplier_name="Agro Supplier SRL",
        line_order=1,
        raw_description=raw_description,
        quantity=Decimal("10"),
        unit="buc",
        unit_price=Decimal("150.00"),
        line_total=Decimal("1500.00"),
        currency="RON",
        line_classification=line_classification,
        canonical_product_id=canonical_product_id,
        canonical_product_name="Roundup" if canonical_product_id else None,
        normalization_confidence=normalization_confidence,
        normalization_method="exact_alias" if canonical_product_id else None,
        has_stock_movement=has_stock_movement,
    )


def _make_input(
    *,
    lines: list[ReviewInvoiceLine] | None = None,
    alerts: list[ReviewAlert] | None = None,
    total_invoices: int = 5,
) -> ProcurementReviewInput:
    return ProcurementReviewInput(
        farm_id="farm-1",
        farm_name="Test Farm",
        lines=lines or [],
        alerts=alerts or [],
        total_invoices=total_invoices,
    )


# ---------------------------------------------------------------------------
# 1. Empty state
# ---------------------------------------------------------------------------


class TestEmptyState:
    def test_no_invoices_returns_safe_empty(self) -> None:
        result = derive_procurement_review(
            _make_input(total_invoices=0),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert result.source == "unavailable"
        assert result.summary.total_invoices_reviewed == 0
        assert result.summary.issues_needing_review == 0
        assert result.issues == []
        assert result.disclaimer == PROCUREMENT_REVIEW_DISCLAIMER

    def test_invoices_but_no_issues(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            has_stock_movement=True,
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=3),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert result.source == "real_records"
        assert result.summary.issues_needing_review == 0
        assert result.issues == []


# ---------------------------------------------------------------------------
# 2. Alert → issue mapping
# ---------------------------------------------------------------------------


class TestAlertMapping:
    def test_suspicious_overpayment_creates_price_movement(self) -> None:
        alert = _make_alert(alert_key="suspicious_overpayment")
        result = derive_procurement_review(
            _make_input(alerts=[alert], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert len(result.issues) == 1
        issue = result.issues[0]
        assert issue.type == "price_movement"
        assert issue.severity in ("medium", "high")
        assert issue.status == "needs_review"
        assert len(issue.evidence) > 0
        assert len(issue.suggested_actions) > 0
        assert len(issue.unsafe_actions) > 0
        assert issue.disclaimer == PROCUREMENT_REVIEW_DISCLAIMER

    def test_possible_duplicate_creates_duplicate_issue(self) -> None:
        alert = _make_alert(
            alert_key="possible_duplicate_invoice",
            evidence={"candidate_invoice_ids": ["inv-2"]},
        )
        result = derive_procurement_review(
            _make_input(alerts=[alert], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert len(result.issues) == 1
        assert result.issues[0].type == "duplicate_invoice_possible"
        assert result.issues[0].severity == "medium"

    def test_confirmed_duplicate_creates_high_severity_issue(self) -> None:
        alert = _make_alert(
            alert_key="confirmed_duplicate_invoice",
            severity="critical",
            evidence={"candidate_invoice_ids": ["inv-2", "inv-3"]},
        )
        result = derive_procurement_review(
            _make_input(alerts=[alert], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert len(result.issues) == 1
        assert result.issues[0].type == "duplicate_invoice_possible"
        assert result.issues[0].severity == "high"

    def test_invoice_total_mismatch_creates_quantity_issue(self) -> None:
        alert = _make_alert(
            alert_key="invoice_total_mismatch",
            evidence={
                "lines_sum": "1500.00",
                "compare_amount": "1600.00",
                "difference": "100.00",
            },
        )
        result = derive_procurement_review(
            _make_input(alerts=[alert], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert len(result.issues) == 1
        assert result.issues[0].type == "quantity_mismatch"

    def test_unknown_alert_key_ignored(self) -> None:
        alert = _make_alert(alert_key="unknown_future_alert")
        result = derive_procurement_review(
            _make_input(alerts=[alert], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert len(result.issues) == 0


# ---------------------------------------------------------------------------
# 3. Product match uncertainty
# ---------------------------------------------------------------------------


class TestProductMatchUncertainty:
    def test_no_product_id_creates_issue(self) -> None:
        line = _make_line(canonical_product_id=None)
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        match_issues = [i for i in result.issues if i.type == "product_match_uncertain"]
        assert len(match_issues) == 1
        assert match_issues[0].severity == "medium"

    def test_low_confidence_creates_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.45"),
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        match_issues = [i for i in result.issues if i.type == "product_match_uncertain"]
        assert len(match_issues) == 1

    def test_high_confidence_no_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        match_issues = [i for i in result.issues if i.type == "product_match_uncertain"]
        assert len(match_issues) == 0


# ---------------------------------------------------------------------------
# 4. Missing stock evidence
# ---------------------------------------------------------------------------


class TestMissingStockEvidence:
    def test_stockable_without_movement_creates_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            line_classification="stockable_input",
            has_stock_movement=False,
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        stock_issues = [i for i in result.issues if i.type == "missing_stock_evidence"]
        assert len(stock_issues) == 1

    def test_stockable_with_movement_no_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            has_stock_movement=True,
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        stock_issues = [i for i in result.issues if i.type == "missing_stock_evidence"]
        assert len(stock_issues) == 0

    def test_non_stockable_without_movement_no_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            line_classification="service",
            has_stock_movement=False,
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        stock_issues = [i for i in result.issues if i.type == "missing_stock_evidence"]
        assert len(stock_issues) == 0


# ---------------------------------------------------------------------------
# 5. Category uncertainty
# ---------------------------------------------------------------------------


class TestCategoryUncertainty:
    def test_no_classification_creates_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            line_classification=None,
            has_stock_movement=True,
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        cat_issues = [i for i in result.issues if i.type == "category_uncertain"]
        assert len(cat_issues) == 1

    def test_with_classification_no_issue(self) -> None:
        line = _make_line(
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            line_classification="stockable_input",
        )
        result = derive_procurement_review(
            _make_input(lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        cat_issues = [i for i in result.issues if i.type == "category_uncertain"]
        assert len(cat_issues) == 0


# ---------------------------------------------------------------------------
# 6. Severity ordering
# ---------------------------------------------------------------------------


class TestSeverityOrdering:
    def test_high_severity_first(self) -> None:
        alerts = [
            _make_alert(
                alert_key="suspicious_overpayment",
                severity="warning",
            ),
            _make_alert(
                alert_key="confirmed_duplicate_invoice",
                severity="critical",
                evidence={"candidate_invoice_ids": ["inv-2"]},
            ),
        ]
        # Use unique alert_ids
        alerts[0] = ReviewAlert(
            alert_id="a1", invoice_id="inv-1", invoice_number="FC-001",
            alert_key="suspicious_overpayment", severity="warning",
            subject_type="invoice_line_item", subject_id="line-1",
            reason_codes=["r1"],
            evidence={"paid_price": "150", "reference_price": "120", "deviation_percent": "25"},
            confidence="high", recommended_action="review",
        )
        alerts[1] = ReviewAlert(
            alert_id="a2", invoice_id="inv-1", invoice_number="FC-001",
            alert_key="confirmed_duplicate_invoice", severity="critical",
            subject_type="invoice", subject_id="inv-1",
            reason_codes=["r2"],
            evidence={"candidate_invoice_ids": ["inv-2"]},
            confidence="high", recommended_action="review",
        )
        result = derive_procurement_review(
            _make_input(alerts=alerts, total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert len(result.issues) >= 2
        # First issue should be high severity
        assert result.issues[0].severity == "high"


# ---------------------------------------------------------------------------
# 7. Safe language
# ---------------------------------------------------------------------------


class TestSafeLanguage:
    def test_no_unsafe_phrases_in_generated_text(self) -> None:
        """Ensure generated review text never contains unsafe claims.

        Unsafe action labels are excluded because they intentionally
        contain unsafe phrases as warnings about what NOT to do.
        """
        alert = _make_alert()
        line = _make_line(
            canonical_product_id=None,
            line_classification=None,
            has_stock_movement=False,
        )
        result = derive_procurement_review(
            _make_input(alerts=[alert], lines=[line], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )

        # Collect all text from issues EXCLUDING unsafe_action labels
        # (which intentionally name the unsafe phrases as warnings)
        all_text: list[str] = [result.disclaimer]
        for issue in result.issues:
            all_text.extend([
                issue.title,
                issue.what_happened,
                issue.why_it_matters,
                issue.disclaimer,
            ])
            for ev in issue.evidence:
                all_text.extend([ev.title, ev.summary, ev.source])
            for sa in issue.suggested_actions:
                all_text.append(sa.label)
            # unsafe_actions.reason is included (should be safe)
            # unsafe_actions.label is EXCLUDED (intentionally names unsafe phrases)
            for ua in issue.unsafe_actions:
                all_text.append(ua.reason)

        combined = "\n".join(all_text).lower()

        for phrase in UNSAFE_PHRASES:
            assert phrase not in combined, (
                f"Unsafe phrase found in generated text: '{phrase}'"
            )

    def test_disclaimer_present_on_all_issues(self) -> None:
        alert = _make_alert()
        result = derive_procurement_review(
            _make_input(alerts=[alert], total_invoices=1),
            generated_at="2026-01-01T00:00:00Z",
        )
        for issue in result.issues:
            assert issue.disclaimer == PROCUREMENT_REVIEW_DISCLAIMER
        assert result.disclaimer == PROCUREMENT_REVIEW_DISCLAIMER


# ---------------------------------------------------------------------------
# 8. Summary counts
# ---------------------------------------------------------------------------


class TestSummaryCounts:
    def test_counts_correct(self) -> None:
        alert = _make_alert(alert_key="suspicious_overpayment")
        line_match = _make_line(
            line_item_id="line-2",
            canonical_product_id=None,
        )
        line_stock = _make_line(
            line_item_id="line-3",
            canonical_product_id="prod-1",
            normalization_confidence=Decimal("0.95"),
            has_stock_movement=False,
        )
        result = derive_procurement_review(
            _make_input(alerts=[alert], lines=[line_match, line_stock], total_invoices=5),
            generated_at="2026-01-01T00:00:00Z",
        )
        assert result.summary.total_invoices_reviewed == 5
        # 1 price + 1 product match + 1 stock = 3
        assert result.summary.issues_needing_review == 3
        assert result.summary.high_attention_issues >= 0
        assert result.summary.product_match_uncertainty_count == 1
        assert result.summary.stock_evidence_count == 1
