"""Contracts layer barrel exports."""

from .enums import (
    BenchmarkSourceKind,
    CorrectionKind,
    InvoiceStatus,
    LineClassification,
    SourceType,
    StockMovementDirection,
)
from .invoices import (
    InvoiceLineItemResponse,
    InvoiceResponse,
    InvoiceUploadRequest,
    InvoiceWithLineItemsResponse,
    LineCorrectionRequest,
    UploadedDocumentResponse,
)
from .products import CanonicalProductResponse, ProductAliasResponse

__all__ = [
    # Enums (re-exported from domain)
    "SourceType",
    "InvoiceStatus",
    "LineClassification",
    "BenchmarkSourceKind",
    "StockMovementDirection",
    "CorrectionKind",
    # Invoice DTOs
    "UploadedDocumentResponse",
    "InvoiceResponse",
    "InvoiceLineItemResponse",
    "InvoiceWithLineItemsResponse",
    "InvoiceUploadRequest",
    "LineCorrectionRequest",
    # Product DTOs
    "CanonicalProductResponse",
    "ProductAliasResponse",
]
