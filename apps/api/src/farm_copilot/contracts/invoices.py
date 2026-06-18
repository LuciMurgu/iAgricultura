"""Pydantic v2 models for invoice-related DTOs.

Used for API request/response serialization, input validation,
and OpenAPI schema generation. All response models use
``ConfigDict(from_attributes=True)`` to allow creation from
SQLAlchemy row objects.

Import rule: contracts can import from domain/ only.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class UploadedDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    source_type: str
    original_filename: str | None
    storage_path: str
    file_size_bytes: int | None
    mime_type: str | None
    uploaded_at: datetime


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    uploaded_document_id: UUID
    supplier_id: UUID | None
    status: str
    invoice_number: str | None
    invoice_date: date | None
    due_date: date | None
    currency: str | None
    subtotal_amount: Decimal | None
    tax_amount: Decimal | None
    total_amount: Decimal | None
    extraction_method: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class InvoiceLineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
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


class InvoiceWithLineItemsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invoice: InvoiceResponse
    line_items: list[InvoiceLineItemResponse]


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class InvoiceUploadRequest(BaseModel):
    """Request body for XML invoice upload."""

    farm_id: UUID


class LineCorrectionRequest(BaseModel):
    """Request body for manual line correction."""

    farm_id: UUID
    line_item_id: UUID
    new_canonical_product_id: UUID
    reason: str | None = None
