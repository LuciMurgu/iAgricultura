"""Pydantic v2 response/request models for /api/v1 JSON endpoints.

All models use ``ConfigDict(from_attributes=True)`` where applicable.
Explicit field types only — no ``Any``.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------


class OkResponse(BaseModel):
    """Generic success response."""

    ok: bool = True


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    """POST /api/v1/auth/login body."""

    email: str
    password: str


class UserResponse(BaseModel):
    """User object returned by auth endpoints."""

    id: UUID
    email: str
    name: str
    farm_id: UUID
    farm_name: str


class LoginResponse(BaseModel):
    """POST /api/v1/auth/login response."""

    user: UserResponse


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class DashboardFeedItem(BaseModel):
    """Single action feed item."""

    priority: int
    icon: str
    title: str
    detail: str
    action_url: str
    action_label: str
    category: str


class DashboardFeedResponse(BaseModel):
    """GET /api/v1/dashboard/feed response."""

    farm_name: str
    user_name: str
    total_invoices: int
    invoices_needing_review: int
    unresolved_alerts: int
    anaf_connected: bool
    anaf_last_sync: datetime | None
    items: list[DashboardFeedItem]


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------


class InvoiceListItem(BaseModel):
    """One invoice in a list response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    invoice_number: str | None
    invoice_date: date | None
    supplier_name: str | None = None
    supplier_cui: str | None = None
    currency: str | None
    total_amount: Decimal | None
    alert_count: int = 0
    created_at: datetime


class InvoiceListResponse(BaseModel):
    """GET /api/v1/invoices response."""

    items: list[InvoiceListItem]
    total: int
    page: int
    pages: int
    status_counts: dict[str, int]


class InvoiceLineItemDetail(BaseModel):
    """Line item within an invoice detail response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    line_order: int
    raw_description: str | None
    quantity: Decimal | None
    unit: str | None
    unit_price: Decimal | None
    line_total: Decimal | None
    tax_rate: Decimal | None
    tax_amount: Decimal | None
    line_classification: str | None
    canonical_product_id: UUID | None
    normalization_confidence: Decimal | None
    normalization_method: str | None


class AlertDetail(BaseModel):
    """Alert within an invoice detail or alert list response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alert_key: str
    severity: str
    subject_type: str | None
    subject_id: str | None
    reason_codes: list[str]
    evidence: dict[str, object]
    confidence: Decimal | None
    recommended_action: str | None
    created_at: datetime


class ExplanationDetail(BaseModel):
    """Explanation within an invoice detail response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    alert_id: UUID
    explanation_key: str
    title: str | None
    body: str | None
    evidence: dict[str, object]
    created_at: datetime


class InvoiceDetailResponse(BaseModel):
    """GET /api/v1/invoices/{id} response."""

    id: UUID
    farm_id: UUID
    status: str
    invoice_number: str | None
    invoice_date: date | None
    due_date: date | None
    currency: str | None
    subtotal_amount: Decimal | None
    tax_amount: Decimal | None
    total_amount: Decimal | None
    extraction_method: str | None
    created_at: datetime
    updated_at: datetime
    line_items: list[InvoiceLineItemDetail]
    alerts: list[AlertDetail]
    explanations: list[ExplanationDetail]


class ReprocessResponse(BaseModel):
    """POST /api/v1/invoices/{id}/reprocess response."""

    ok: bool = True
    new_status: str


class CorrectLineRequest(BaseModel):
    """POST /api/v1/invoices/{id}/correct-line body."""

    line_item_id: UUID
    canonical_product_id: UUID
    reason: str = ""


class CorrectLineResponse(BaseModel):
    """POST /api/v1/invoices/{id}/correct-line response."""

    ok: bool = True
    line_item_id: UUID
    new_canonical_product_id: UUID


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------


class StockBalanceItem(BaseModel):
    """One product in the stock overview."""

    product_id: UUID
    product_name: str
    category: str | None
    unit: str
    total_in: Decimal
    total_out: Decimal
    balance: Decimal
    last_movement_at: datetime | None


class StockListResponse(BaseModel):
    """GET /api/v1/stock response."""

    items: list[StockBalanceItem]
    total_products: int


class StockMovementItem(BaseModel):
    """One stock movement in the detail response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    direction: str
    quantity: Decimal
    unit: str
    effective_at: datetime
    invoice_id: UUID | None
    notes: str | None


class StockDetailResponse(BaseModel):
    """GET /api/v1/stock/{product_id} response."""

    product_id: UUID
    product_name: str
    category: str | None
    default_unit: str | None
    movements: list[StockMovementItem]


# ---------------------------------------------------------------------------
# ANAF
# ---------------------------------------------------------------------------


class AnafStatusResponse(BaseModel):
    """GET /api/v1/anaf/status/{farm_id} response."""

    connected: bool
    last_sync: datetime | None = None
    cif: str | None = None
    token_valid: bool = False
    refresh_days_remaining: int | None = None
    sync_enabled: bool = False
    sync_interval_hours: int = 4


class AnafSyncResponse(BaseModel):
    """POST /api/v1/anaf/sync/{farm_id} response."""

    ok: bool = True
    invoices_created: int = 0
    duplicates_skipped: int = 0
    errors: int = 0


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


class AlertListItem(BaseModel):
    """One alert in the alert list response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    alert_key: str
    severity: str
    subject_type: str | None
    subject_id: str | None
    reason_codes: list[str]
    confidence: Decimal | None
    recommended_action: str | None
    created_at: datetime


class AlertListResponse(BaseModel):
    """GET /api/v1/alerts response."""

    items: list[AlertListItem]
    total: int


# ---------------------------------------------------------------------------
# Bulk export
# ---------------------------------------------------------------------------


class BulkExportRequest(BaseModel):
    """POST /api/v1/export/saga/bulk body."""

    invoice_ids: list[UUID]
