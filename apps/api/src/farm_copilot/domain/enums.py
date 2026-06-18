"""Pure domain enums — independent from database/models.py.

These mirror the database enum values exactly but are defined separately
to keep the domain layer free of SQLAlchemy (or any external) imports.
"""

import enum


class SourceType(enum.StrEnum):
    PDF = "pdf"
    IMAGE = "image"
    XML = "xml"


class InvoiceStatus(enum.StrEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    NEEDS_REVIEW = "needs_review"
    COMPLETED = "completed"
    FAILED = "failed"


class LineClassification(enum.StrEnum):
    STOCKABLE_INPUT = "stockable_input"
    NON_STOCKABLE_CHARGE = "non_stockable_charge"
    SERVICE = "service"
    DISCOUNT_ADJUSTMENT = "discount_adjustment"


class BenchmarkSourceKind(enum.StrEnum):
    INVOICE = "invoice"
    QUOTE = "quote"
    MANUAL_ENTRY = "manual_entry"
    TRUSTED_FEED = "trusted_feed"


class StockMovementDirection(enum.StrEnum):
    IN = "in"
    OUT = "out"
    ADJUSTMENT = "adjustment"


class CorrectionKind(enum.StrEnum):
    CANONICAL_PRODUCT_REASSIGNMENT = "canonical_product_reassignment"
