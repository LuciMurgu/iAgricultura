"""Domain entity types — plain frozen dataclasses.

No methods, no validation, no DB mapping.  These are immutable data
containers that flow through all domain logic functions.

IDs are ``str`` (not ``uuid.UUID``) to keep the domain free of any
stdlib UUID or ORM concerns — the database layer handles conversion.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Farm:
    id: str
    name: str


@dataclass(frozen=True)
class Supplier:
    id: str
    farm_id: str
    name: str
    tax_id: str | None


@dataclass(frozen=True)
class UploadedDocument:
    id: str
    farm_id: str
    source_type: str
    original_filename: str | None
    storage_path: str


@dataclass(frozen=True)
class Invoice:
    id: str
    farm_id: str
    uploaded_document_id: str
    supplier_id: str | None
    status: str
    invoice_number: str | None
    invoice_date: str | None
    due_date: str | None
    currency: str
    subtotal_amount: Decimal | None
    tax_amount: Decimal | None
    total_amount: Decimal | None


@dataclass(frozen=True)
class InvoiceLineItem:
    id: str
    invoice_id: str
    line_order: int
    raw_description: str | None
    quantity: Decimal | None
    unit: str | None
    unit_price: Decimal | None
    line_total: Decimal | None
    tax_rate: Decimal | None
    tax_amount: Decimal | None
    line_classification: str | None
    canonical_product_id: str | None
    normalization_confidence: Decimal | None
    normalization_method: str | None


@dataclass(frozen=True)
class CanonicalProduct:
    id: str
    name: str
    category: str | None
    default_unit: str | None
    active: bool


@dataclass(frozen=True)
class ProductAlias:
    id: str
    canonical_product_id: str
    alias_text: str
    farm_id: str | None
    supplier_id: str | None
    source: str | None


@dataclass(frozen=True)
class InvoiceWithLineItems:
    invoice: Invoice
    line_items: list[InvoiceLineItem]
