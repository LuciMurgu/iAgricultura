"""Procurement review — aggregate farm invoice/alert/stock data into review issues.

Pure domain logic: only stdlib + domain imports.
No DB imports. No side effects. No HTTP concerns.

Takes structured input (invoice lines, alerts, stock evidence indicators),
returns structured review issues suitable for the frontend Procurement Review
experience.

Issue generation is conservative: only from real available signals.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------

IssueType = Literal[
    "price_movement",
    "product_match_uncertain",
    "supplier_concentration",
    "quantity_mismatch",
    "missing_stock_evidence",
    "duplicate_invoice_possible",
    "category_uncertain",
]

IssueSeverity = Literal["low", "medium", "high"]
IssueStatus = Literal[
    "needs_review", "reviewing", "accepted", "corrected",
    "dismissed", "pending_evidence",
]
EvidenceType = Literal[
    "invoice", "stock_record", "procurement_history",
    "product_mapping", "demo_data",
]
ActionType = Literal["review", "navigate", "prepare", "disabled"]
ReviewerRole = Literal["farmer", "accountant"]

# ---------------------------------------------------------------------------
# Shared disclaimer
# ---------------------------------------------------------------------------

PROCUREMENT_REVIEW_DISCLAIMER = (
    "This is a review signal based on farm records, "
    "not a final financial, accounting, legal or tax judgement."
)

# ---------------------------------------------------------------------------
# Input data — from database queries
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ReviewInvoiceLine:
    """A single invoice line item for review."""

    line_item_id: str
    invoice_id: str
    invoice_number: str | None
    invoice_date: str | None
    supplier_name: str | None
    line_order: int
    raw_description: str | None
    quantity: Decimal | None
    unit: str | None
    unit_price: Decimal | None
    line_total: Decimal | None
    currency: str
    line_classification: str | None
    canonical_product_id: str | None
    canonical_product_name: str | None
    normalization_confidence: Decimal | None
    normalization_method: str | None
    has_stock_movement: bool


@dataclass(frozen=True)
class ReviewAlert:
    """An existing alert record relevant to procurement review."""

    alert_id: str
    invoice_id: str
    invoice_number: str | None
    alert_key: str  # suspicious_overpayment, possible_duplicate_invoice, etc.
    severity: str  # warning, critical
    subject_type: str
    subject_id: str
    reason_codes: list[str]
    evidence: dict[str, object]
    confidence: str
    recommended_action: str


@dataclass(frozen=True)
class ProcurementReviewInput:
    """Input for procurement review derivation."""

    farm_id: str
    farm_name: str
    lines: list[ReviewInvoiceLine] = field(default_factory=list)
    alerts: list[ReviewAlert] = field(default_factory=list)
    total_invoices: int = 0


# ---------------------------------------------------------------------------
# Output types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ReviewEvidenceItem:
    """One piece of evidence supporting a review issue."""

    id: str
    type: EvidenceType
    title: str
    source: str
    summary: str
    confidence: str | None = None  # low, medium, high
    date: str | None = None


@dataclass(frozen=True)
class ReviewSuggestedAction:
    """A safe action the farmer can take."""

    label: str
    action_type: ActionType
    href: str | None = None
    disabled_reason: str | None = None


@dataclass(frozen=True)
class ReviewUnsafeAction:
    """An action the farmer should NOT take based on this signal alone."""

    label: str
    reason: str


@dataclass(frozen=True)
class ReviewIssue:
    """A single procurement review issue."""

    id: str
    type: IssueType
    severity: IssueSeverity
    status: IssueStatus
    title: str
    what_happened: str
    why_it_matters: str
    supplier_name: str | None = None
    product_name: str | None = None
    normalized_product_name: str | None = None
    invoice_id: str | None = None
    invoice_number: str | None = None
    invoice_date: str | None = None
    quantity: str | None = None
    unit: str | None = None
    unit_price: str | None = None
    currency: str = "RON"
    product_match_confidence: str | None = None
    evidence: list[ReviewEvidenceItem] = field(default_factory=list)
    suggested_actions: list[ReviewSuggestedAction] = field(default_factory=list)
    unsafe_actions: list[ReviewUnsafeAction] = field(default_factory=list)
    reviewer_roles: list[ReviewerRole] = field(
        default_factory=lambda: ["farmer", "accountant"]
    )
    disclaimer: str = PROCUREMENT_REVIEW_DISCLAIMER


@dataclass(frozen=True)
class ReviewSummary:
    """Aggregate summary for the procurement review response."""

    total_invoices_reviewed: int
    issues_needing_review: int
    high_attention_issues: int
    product_match_uncertainty_count: int
    stock_evidence_count: int
    possible_margin_attention_ron: str | None = None


@dataclass(frozen=True)
class ProcurementReviewResult:
    """Final procurement review output."""

    farm_id: str
    farm_name: str
    source: Literal["real_records", "demo_records", "mixed", "unavailable"]
    generated_at: str
    summary: ReviewSummary
    issues: list[ReviewIssue] = field(default_factory=list)
    disclaimer: str = PROCUREMENT_REVIEW_DISCLAIMER


# ---------------------------------------------------------------------------
# Issue builders — one per issue type
# ---------------------------------------------------------------------------


_SAFE_ACTIONS_PRICE = [
    ReviewSuggestedAction(
        label="Review invoice and compare with recent purchases",
        action_type="review",
    ),
    ReviewSuggestedAction(
        label="Discuss with accountant before acting",
        action_type="review",
    ),
]

_UNSAFE_ACTIONS_PRICE = [
    ReviewUnsafeAction(
        label="Assume supplier wrongdoing before review",
        reason=(
            "Price deviations may reflect market conditions, delivery terms, "
            "or product differences."
        ),
    ),
    ReviewUnsafeAction(
        label="Claim guaranteed savings from this signal",
        reason=(
            "Price comparisons are reference signals from farm records, "
            "not audited financial calculations."
        ),
    ),
]

_SAFE_ACTIONS_PRODUCT_MATCH = [
    ReviewSuggestedAction(
        label="Verify product mapping in invoice detail",
        action_type="review",
    ),
    ReviewSuggestedAction(
        label="Correct product assignment if needed",
        action_type="navigate",
        href="/invoices",
    ),
]

_UNSAFE_ACTIONS_PRODUCT_MATCH = [
    ReviewUnsafeAction(
        label="Assume the product mapping is final",
        reason=(
            "Low-confidence mappings may assign incorrect benchmark prices "
            "and stock categories."
        ),
    ),
]

_SAFE_ACTIONS_STOCK = [
    ReviewSuggestedAction(
        label="Check stock records for this product",
        action_type="review",
    ),
    ReviewSuggestedAction(
        label="Verify physical stock or delivery documentation",
        action_type="prepare",
    ),
]

_UNSAFE_ACTIONS_STOCK = [
    ReviewUnsafeAction(
        label="Assume stock was received without verification",
        reason="Missing stock evidence may indicate delivery not yet recorded.",
    ),
]

_SAFE_ACTIONS_DUPLICATE = [
    ReviewSuggestedAction(
        label="Compare with candidate invoice",
        action_type="review",
    ),
    ReviewSuggestedAction(
        label="Mark as not-duplicate if verified",
        action_type="review",
    ),
]

_UNSAFE_ACTIONS_DUPLICATE = [
    ReviewUnsafeAction(
        label="Pay without verifying duplicate status",
        reason="Duplicate invoices risk double payment.",
    ),
]

_SAFE_ACTIONS_CATEGORY = [
    ReviewSuggestedAction(
        label="Review line classification",
        action_type="review",
    ),
]

_UNSAFE_ACTIONS_CATEGORY = [
    ReviewUnsafeAction(
        label="Assume classification is correct",
        reason=(
            "Missing classification may affect stock tracking "
            "and cost analysis."
        ),
    ),
]

_SAFE_ACTIONS_MISMATCH = [
    ReviewSuggestedAction(
        label="Compare line totals with invoice header",
        action_type="review",
    ),
    ReviewSuggestedAction(
        label="Contact supplier if discrepancy confirmed",
        action_type="prepare",
    ),
]

_UNSAFE_ACTIONS_MISMATCH = [
    ReviewUnsafeAction(
        label="Ignore the total mismatch",
        reason=(
            "Invoice total discrepancies may affect tax reporting "
            "and payment accuracy."
        ),
    ),
]


def _build_price_movement_issue(alert: ReviewAlert) -> ReviewIssue:
    """Build issue from suspicious_overpayment alert."""
    ev = alert.evidence
    paid = ev.get("paid_price", "")
    ref = ev.get("reference_price", "")
    pct = ev.get("deviation_percent", "")

    return ReviewIssue(
        id=f"pr-price-{alert.alert_id}",
        type="price_movement",
        severity="high" if alert.severity == "critical" else "medium",
        status="needs_review",
        title=f"Price deviation detected on invoice {alert.invoice_number or 'unknown'}",
        what_happened=(
            f"Unit price ({paid}) is {pct}% above reference ({ref}) "
            f"based on local purchase history."
        ),
        why_it_matters=(
            "A significant price deviation may indicate an invoice error, "
            "changed supplier terms, or a product difference that needs review."
        ),
        invoice_id=alert.invoice_id,
        invoice_number=alert.invoice_number,
        unit_price=str(paid) if paid else None,
        evidence=[
            ReviewEvidenceItem(
                id=f"ev-alert-{alert.alert_id}",
                type="procurement_history",
                title="Price comparison from farm purchase history",
                source="Farm invoice records",
                summary=(
                    f"Paid {paid}, reference {ref} "
                    f"({pct}% deviation)."
                ),
                confidence=alert.confidence,
            ),
        ],
        suggested_actions=list(_SAFE_ACTIONS_PRICE),
        unsafe_actions=list(_UNSAFE_ACTIONS_PRICE),
    )


def _build_duplicate_issue(alert: ReviewAlert) -> ReviewIssue:
    """Build issue from duplicate invoice alert."""
    ev = alert.evidence
    candidate_ids = ev.get("candidate_invoice_ids", [])
    count = len(candidate_ids) if isinstance(candidate_ids, list) else 0

    severity: IssueSeverity = (
        "high" if alert.alert_key == "confirmed_duplicate_invoice" else "medium"
    )

    return ReviewIssue(
        id=f"pr-dup-{alert.alert_id}",
        type="duplicate_invoice_possible",
        severity=severity,
        status="needs_review",
        title=(
            f"Possible duplicate: invoice {alert.invoice_number or 'unknown'} "
            f"matches {count} existing invoice(s)"
        ),
        what_happened=(
            f"Invoice {alert.invoice_number or 'unknown'} shares criteria "
            f"with {count} previously processed invoice(s)."
        ),
        why_it_matters=(
            "Duplicate invoices risk double payment or duplicate "
            "stock movements."
        ),
        invoice_id=alert.invoice_id,
        invoice_number=alert.invoice_number,
        evidence=[
            ReviewEvidenceItem(
                id=f"ev-dup-{alert.alert_id}",
                type="invoice",
                title="Duplicate candidate comparison",
                source="Farm invoice records",
                summary=f"Matches {count} candidate invoice(s).",
                confidence=alert.confidence,
            ),
        ],
        suggested_actions=list(_SAFE_ACTIONS_DUPLICATE),
        unsafe_actions=list(_UNSAFE_ACTIONS_DUPLICATE),
    )


def _build_total_mismatch_issue(alert: ReviewAlert) -> ReviewIssue:
    """Build issue from invoice_total_mismatch alert."""
    ev = alert.evidence
    line_sum = ev.get("lines_sum", "")
    header = ev.get("compare_amount", "")
    diff = ev.get("difference", "")

    return ReviewIssue(
        id=f"pr-mismatch-{alert.alert_id}",
        type="quantity_mismatch",
        severity="medium",
        status="needs_review",
        title=f"Invoice total mismatch: {alert.invoice_number or 'unknown'}",
        what_happened=(
            f"Sum of line totals ({line_sum}) does not match "
            f"invoice header ({header}). Difference: {diff}."
        ),
        why_it_matters=(
            "A mismatch between line totals and the invoice header "
            "may indicate a missing line or calculation error."
        ),
        invoice_id=alert.invoice_id,
        invoice_number=alert.invoice_number,
        evidence=[
            ReviewEvidenceItem(
                id=f"ev-mismatch-{alert.alert_id}",
                type="invoice",
                title="Line total vs header comparison",
                source="Invoice calculation",
                summary=f"Lines sum: {line_sum}, header: {header}, diff: {diff}.",
                confidence="high",
            ),
        ],
        suggested_actions=list(_SAFE_ACTIONS_MISMATCH),
        unsafe_actions=list(_UNSAFE_ACTIONS_MISMATCH),
    )


def _build_product_match_issue(line: ReviewInvoiceLine) -> ReviewIssue:
    """Build issue for low-confidence or missing product mapping."""
    conf_label = "unknown"
    if line.normalization_confidence is not None:
        if line.normalization_confidence >= Decimal("0.7"):
            conf_label = "high"
        elif line.normalization_confidence >= Decimal("0.4"):
            conf_label = "medium"
        else:
            conf_label = "low"

    return ReviewIssue(
        id=f"pr-match-{line.line_item_id}",
        type="product_match_uncertain",
        severity="medium" if line.canonical_product_id is None else "low",
        status="needs_review",
        title=(
            f"Product match uncertain: "
            f"{line.raw_description or 'unnamed line'}"
        ),
        what_happened=(
            f"Line '{line.raw_description or 'unknown'}' on invoice "
            f"{line.invoice_number or 'unknown'} has "
            + (
                f"confidence {line.normalization_confidence}"
                if line.normalization_confidence is not None
                else "no product mapping"
            )
            + "."
        ),
        why_it_matters=(
            "Uncertain product mapping may affect benchmark comparisons, "
            "stock tracking, and cost categorization."
        ),
        supplier_name=line.supplier_name,
        product_name=line.raw_description,
        normalized_product_name=line.canonical_product_name,
        invoice_id=line.invoice_id,
        invoice_number=line.invoice_number,
        invoice_date=line.invoice_date,
        quantity=str(line.quantity) if line.quantity is not None else None,
        unit=line.unit,
        unit_price=str(line.unit_price) if line.unit_price is not None else None,
        currency=line.currency,
        product_match_confidence=conf_label,
        evidence=[
            ReviewEvidenceItem(
                id=f"ev-match-{line.line_item_id}",
                type="product_mapping",
                title="Product normalization result",
                source="Product matching pipeline",
                summary=(
                    f"Method: {line.normalization_method or 'none'}, "
                    f"confidence: {line.normalization_confidence or 'none'}."
                ),
                confidence=conf_label,
                date=line.invoice_date,
            ),
        ],
        suggested_actions=list(_SAFE_ACTIONS_PRODUCT_MATCH),
        unsafe_actions=list(_UNSAFE_ACTIONS_PRODUCT_MATCH),
    )


def _build_missing_stock_issue(line: ReviewInvoiceLine) -> ReviewIssue:
    """Build issue for stockable line missing stock movement."""
    return ReviewIssue(
        id=f"pr-stock-{line.line_item_id}",
        type="missing_stock_evidence",
        severity="low",
        status="needs_review",
        title=(
            f"Missing stock evidence: "
            f"{line.raw_description or 'unnamed line'}"
        ),
        what_happened=(
            f"Stockable line '{line.raw_description or 'unknown'}' on invoice "
            f"{line.invoice_number or 'unknown'} has no stock-in movement."
        ),
        why_it_matters=(
            "Missing stock evidence may indicate a delivery not yet recorded "
            "or a pipeline processing gap."
        ),
        supplier_name=line.supplier_name,
        product_name=line.raw_description,
        invoice_id=line.invoice_id,
        invoice_number=line.invoice_number,
        invoice_date=line.invoice_date,
        evidence=[
            ReviewEvidenceItem(
                id=f"ev-stock-{line.line_item_id}",
                type="stock_record",
                title="Stock movement check",
                source="Stock movement records",
                summary="No stock-in movement found for this invoice line.",
                confidence="high",
                date=line.invoice_date,
            ),
        ],
        suggested_actions=list(_SAFE_ACTIONS_STOCK),
        unsafe_actions=list(_UNSAFE_ACTIONS_STOCK),
    )


def _build_category_uncertain_issue(line: ReviewInvoiceLine) -> ReviewIssue:
    """Build issue for line missing classification."""
    return ReviewIssue(
        id=f"pr-cat-{line.line_item_id}",
        type="category_uncertain",
        severity="low",
        status="needs_review",
        title=(
            f"Category uncertain: "
            f"{line.raw_description or 'unnamed line'}"
        ),
        what_happened=(
            f"Line '{line.raw_description or 'unknown'}' on invoice "
            f"{line.invoice_number or 'unknown'} has no classification."
        ),
        why_it_matters=(
            "Missing classification affects which lines create stock "
            "movements and how costs are categorized."
        ),
        product_name=line.raw_description,
        invoice_id=line.invoice_id,
        invoice_number=line.invoice_number,
        evidence=[
            ReviewEvidenceItem(
                id=f"ev-cat-{line.line_item_id}",
                type="invoice",
                title="Line classification status",
                source="Classification pipeline",
                summary="No line classification assigned.",
            ),
        ],
        suggested_actions=list(_SAFE_ACTIONS_CATEGORY),
        unsafe_actions=list(_UNSAFE_ACTIONS_CATEGORY),
    )


# ---------------------------------------------------------------------------
# Alert key → builder dispatch
# ---------------------------------------------------------------------------

_ALERT_BUILDERS: dict[str, object] = {
    "suspicious_overpayment": _build_price_movement_issue,
    "possible_duplicate_invoice": _build_duplicate_issue,
    "confirmed_duplicate_invoice": _build_duplicate_issue,
    "invoice_total_mismatch": _build_total_mismatch_issue,
}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def derive_procurement_review(
    review_input: ProcurementReviewInput,
    *,
    generated_at: str,
) -> ProcurementReviewResult:
    """Derive procurement review issues from invoice/alert/stock data.

    Issue generation rules:
    1. Alert-based issues: map existing alert_key → issue type.
    2. Product match uncertainty: lines with no canonical_product_id
       or normalization_confidence < 0.7.
    3. Missing stock evidence: stockable lines with no stock movement.
    4. Category uncertain: lines with no line_classification.

    Conservative: only generates issues from real signals.
    """
    issues: list[ReviewIssue] = []
    seen_line_ids: set[str] = set()

    # 1. Alert-based issues
    for alert in review_input.alerts:
        builder = _ALERT_BUILDERS.get(alert.alert_key)
        if builder is not None:
            issues.append(builder(alert))  # type: ignore[operator]

    # 2. Product match uncertainty
    for line in review_input.lines:
        needs_review = (
            line.canonical_product_id is None
            or (
                line.normalization_confidence is not None
                and line.normalization_confidence < Decimal("0.7")
            )
        )
        if needs_review and line.line_item_id not in seen_line_ids:
            issues.append(_build_product_match_issue(line))
            seen_line_ids.add(line.line_item_id)

    # 3. Missing stock evidence (stockable lines only)
    for line in review_input.lines:
        is_stockable = line.line_classification == "stockable_input"
        if (
            is_stockable
            and not line.has_stock_movement
            and line.line_item_id not in seen_line_ids
        ):
            issues.append(_build_missing_stock_issue(line))
            seen_line_ids.add(line.line_item_id)

    # 4. Category uncertain
    for line in review_input.lines:
        if (
            line.line_classification is None
            and line.line_item_id not in seen_line_ids
        ):
            issues.append(_build_category_uncertain_issue(line))
            seen_line_ids.add(line.line_item_id)

    # Sort: high severity first, then medium, then low
    severity_order: dict[str, int] = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda i: severity_order.get(i.severity, 3))

    # Summary
    high_issues = sum(1 for i in issues if i.severity == "high")
    match_issues = sum(1 for i in issues if i.type == "product_match_uncertain")
    stock_issues = sum(1 for i in issues if i.type == "missing_stock_evidence")

    source: Literal["real_records", "demo_records", "mixed", "unavailable"] = (
        "real_records" if review_input.total_invoices > 0 else "unavailable"
    )

    return ProcurementReviewResult(
        farm_id=review_input.farm_id,
        farm_name=review_input.farm_name,
        source=source,
        generated_at=generated_at,
        summary=ReviewSummary(
            total_invoices_reviewed=review_input.total_invoices,
            issues_needing_review=len(issues),
            high_attention_issues=high_issues,
            product_match_uncertainty_count=match_issues,
            stock_evidence_count=stock_issues,
        ),
        issues=issues,
    )
