"""Worker package — shims bridging domain logic and database persistence."""

from .alert_derivation import derive_alerts_from_validation
from .anaf_sync import run_anaf_sync
from .benchmark_comparison import resolve_benchmark_comparison
from .efactura_parser import parse_efactura_xml
from .exact_normalization import resolve_exact_normalization
from .explanation_derivation import derive_explanations_from_alerts
from .invoice_validation import resolve_invoice_validation
from .line_classification import resolve_line_classification
from .line_correction import apply_unresolved_line_correction
from .mappers import (
    map_canonical_product,
    map_invoice,
    map_line_item,
    map_product_alias,
)
from .stock_in import resolve_stock_in
from .xml_extraction import resolve_xml_extraction
from .xml_invoice_processing import (
    resolve_xml_invoice_processing,
    run_xml_invoice_processing,
)

__all__ = [
    # Parser
    "parse_efactura_xml",
    # Mappers
    "map_invoice",
    "map_line_item",
    "map_canonical_product",
    "map_product_alias",
    # Pipeline shims
    "resolve_xml_extraction",
    "resolve_line_classification",
    "resolve_exact_normalization",
    "resolve_benchmark_comparison",
    "resolve_invoice_validation",
    "resolve_stock_in",
    "derive_alerts_from_validation",
    "derive_explanations_from_alerts",
    "apply_unresolved_line_correction",
    # Pipeline orchestrator
    "resolve_xml_invoice_processing",
    "run_xml_invoice_processing",
    # ANAF sync
    "run_anaf_sync",
]

