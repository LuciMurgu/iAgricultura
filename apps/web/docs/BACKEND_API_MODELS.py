# ─────────────────────────────────────────────────────────────────────
# BACKEND API MODELS — copied from src/farm_copilot/contracts/api_v1_models.py
# This is the SOURCE OF TRUTH for frontend Zod schema generation.
# Type mapping: Decimal→z.number(), UUID→z.string().uuid(),
#   datetime→z.string().datetime(), date→z.string(),
#   dict[str,object]→z.record(z.string(), z.unknown()), nullable→.nullable()
# ─────────────────────────────────────────────────────────────────────

from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: UUID
    farm_id: UUID
    email: str
    farm_name: str
    farm_area_ha: float | None = None
    farm_location: str | None = None
    role: str  # "owner" | "member" | "viewer"

class LoginResponse(BaseModel):
    user: UserResponse
    message: str | None = None


# ── Dashboard ─────────────────────────────────────────────────────────

class DashboardStatsResponse(BaseModel):
    invoice_count: int
    invoice_total_ron: Decimal
    alert_count: int
    critical_alert_count: int
    stock_value_ron: Decimal
    pending_review_count: int

class ActionFeedItem(BaseModel):
    id: str
    type: str       # "sync" | "ai_recommendation" | "cooperative" | "fiscal" | "weather" | "alert" | "correction"
    title: str
    detail: str
    severity: str   # "info" | "warning" | "urgent"
    timestamp: datetime
    source: str     # "SPV" | "APIA" | "AI" | "e-Transport" | "Sistem"
    action_url: str | None = None
    action_label: str | None = None

class DashboardResponse(BaseModel):
    stats: DashboardStatsResponse
    actions: list[ActionFeedItem]
    anaf_connected: bool
    last_sync: datetime | None = None


# ── Invoices ──────────────────────────────────────────────────────────

class InvoiceLineItemResponse(BaseModel):
    id: UUID
    line_number: int
    raw_description: str
    canonical_product_name: str | None = None
    quantity: Decimal
    unit: str
    unit_price: Decimal
    line_total: Decimal
    classification: str           # "stockable" | "freight" | "service" | "discount"
    normalization_status: str     # "matched" | "unmatched" | "ambiguous"
    normalization_confidence: float | None = None
    normalization_source: str | None = None   # "exact_alias" | "fuzzy" | "ai" | "manual_correction"
    canonical_product_id: UUID | None = None
    suggestions: list[ProductSuggestion] | None = None

class ProductSuggestion(BaseModel):
    product_id: UUID
    product_name: str
    score: float

class InvoiceDetailResponse(BaseModel):
    id: UUID
    farm_id: UUID
    invoice_number: str
    supplier_name: str
    supplier_cui: str | None = None
    issue_date: date
    due_date: date | None = None
    currency: str
    total_without_vat: Decimal
    vat_amount: Decimal
    total_with_vat: Decimal
    status: str   # "pending" | "processing" | "needs_review" | "completed" | "error"
    source: str   # "xml_upload" | "anaf_spv"
    anaf_id: str | None = None
    created_at: datetime
    line_items: list[InvoiceLineItemResponse]
    alerts: list[AlertResponse]
    explanations: list[ExplanationResponse]

class InvoiceListItemResponse(BaseModel):
    id: UUID
    invoice_number: str
    supplier_name: str
    supplier_cui: str | None = None
    issue_date: date
    total_with_vat: Decimal
    status: str
    source: str
    alert_count: int
    line_item_count: int
    created_at: datetime

class InvoiceListResponse(BaseModel):
    items: list[InvoiceListItemResponse]
    total: int
    page: int
    page_size: int


# ── Alerts ────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    alert_type: str      # "suspicious_overpayment" | "possible_duplicate" | "confirmed_duplicate" | "invoice_total_mismatch"
    severity: str        # "urgent" | "warning" | "info"
    title: str
    message: str
    confidence: float
    evidence: dict[str, object]
    created_at: datetime

class AlertListResponse(BaseModel):
    items: list[AlertResponse]
    total: int


# ── Explanations ──────────────────────────────────────────────────────

class ExplanationResponse(BaseModel):
    id: UUID
    alert_id: UUID
    invoice_id: UUID
    explanation_type: str
    title: str
    body: str
    evidence: dict[str, object]
    next_action: str | None = None
    created_at: datetime


# ── Stock ─────────────────────────────────────────────────────────────

class StockBalanceResponse(BaseModel):
    product_id: UUID
    product_name: str
    category: str | None = None
    unit: str
    total_in: Decimal
    total_out: Decimal
    balance: Decimal
    value_ron: Decimal | None = None

class StockMovementResponse(BaseModel):
    id: UUID
    product_id: UUID
    direction: str       # "in" | "out" | "adjustment"
    quantity: Decimal
    unit: str
    invoice_id: UUID | None = None
    invoice_number: str | None = None
    created_at: datetime

class StockOverviewResponse(BaseModel):
    balances: list[StockBalanceResponse]


# ── ANAF ──────────────────────────────────────────────────────────────

class AnafStatusResponse(BaseModel):
    connected: bool
    last_sync: datetime | None = None
    cif: str | None = None
    token_valid: bool
    sync_enabled: bool
    sync_interval_hours: float


# ── SAGA Export ───────────────────────────────────────────────────────

class SagaExportResponse(BaseModel):
    filename: str
    invoice_count: int
    total_ron: Decimal
    xml_content: str  # Base64 or direct XML string
