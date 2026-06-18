"""Re-export domain enums for contract-layer convenience.

API code imports enums from contracts, not domain directly.
This keeps the import direction clean: contracts → domain (allowed).
"""

from farm_copilot.domain.enums import (
    BenchmarkSourceKind,
    CorrectionKind,
    InvoiceStatus,
    LineClassification,
    SourceType,
    StockMovementDirection,
)

__all__ = [
    "SourceType",
    "InvoiceStatus",
    "LineClassification",
    "BenchmarkSourceKind",
    "StockMovementDirection",
    "CorrectionKind",
]
