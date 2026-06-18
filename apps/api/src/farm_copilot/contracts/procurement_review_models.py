"""Pydantic v2 response models for the procurement review endpoint.

All money values serialized as strings to avoid float drift.
All models use snake_case per project convention.
"""

from __future__ import annotations

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Nested models
# ---------------------------------------------------------------------------


class ProcurementReviewEvidenceItem(BaseModel):
    """One piece of evidence supporting a review issue."""

    id: str
    type: str  # invoice, stock_record, procurement_history, product_mapping
    title: str
    source: str
    summary: str
    confidence: str | None = None
    date: str | None = None


class ProcurementReviewSuggestedAction(BaseModel):
    """A safe action the farmer can take."""

    label: str
    action_type: str  # review, navigate, prepare, disabled
    href: str | None = None
    disabled_reason: str | None = None


class ProcurementReviewUnsafeAction(BaseModel):
    """An action the farmer should NOT take based on this signal alone."""

    label: str
    reason: str


class ProcurementReviewIssueResponse(BaseModel):
    """A single procurement review issue."""

    id: str
    type: str
    severity: str
    status: str
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
    evidence: list[ProcurementReviewEvidenceItem] = []
    suggested_actions: list[ProcurementReviewSuggestedAction] = []
    unsafe_actions: list[ProcurementReviewUnsafeAction] = []
    reviewer_roles: list[str] = ["farmer", "accountant"]
    disclaimer: str = ""


class ProcurementReviewSummaryResponse(BaseModel):
    """Aggregate counts for the review."""

    total_invoices_reviewed: int = 0
    issues_needing_review: int = 0
    high_attention_issues: int = 0
    product_match_uncertainty_count: int = 0
    stock_evidence_count: int = 0
    possible_margin_attention_ron: str | None = None


# ---------------------------------------------------------------------------
# Top-level response
# ---------------------------------------------------------------------------


class ProcurementReviewResponse(BaseModel):
    """GET /api/v1/procurement/review response."""

    farm_id: str
    farm_name: str | None = None
    generated_at: str | None = None
    source: str  # real_records, demo_records, mixed, unavailable
    summary: ProcurementReviewSummaryResponse
    issues: list[ProcurementReviewIssueResponse] = []
    disclaimer: str = (
        "This is a review signal based on farm records, "
        "not a final financial, accounting, legal or tax judgement."
    )
