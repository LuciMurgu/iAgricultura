"""Database package — models, session factory, and query helpers."""

from .anaf_sync_log import (
    complete_sync_log,
    get_last_successful_sync,
    insert_sync_log,
    is_already_downloaded,
    list_sync_logs,
)
from .anaf_tokens import (
    delete_anaf_token,
    get_anaf_token_by_farm,
    get_decrypted_tokens,
    list_all_active_tokens,
    needs_refresh,
    update_refreshed_tokens,
    upsert_anaf_token,
)
from .benchmark_observations import (
    insert_benchmark_observation,
    insert_benchmark_observations_batch,
    list_benchmark_observations,
    list_benchmark_observations_by_provenance,
)
from .canonical_products import get_canonical_product_by_id, list_canonical_products
from .encryption import decrypt_token, encrypt_token
from .invoice_alerts import (
    count_alerts_by_invoice_ids,
    delete_alerts_by_invoice_id,
    get_alerts_by_invoice_id,
    persist_invoice_alerts,
)
from .invoice_duplicate_candidates import list_invoice_duplicate_candidates
from .invoice_explanations import (
    delete_explanations_by_invoice_id,
    get_explanations_by_invoice_id,
    persist_invoice_explanations,
)
from .invoice_extraction import (
    get_invoice_for_extraction_by_id,
    update_invoice_extraction,
)
from .invoice_intake import (
    count_invoices_by_status,
    get_invoice_shell_by_id,
    get_uploaded_document_by_id,
    insert_invoice_shell,
    insert_uploaded_document,
    list_invoices_by_farm,
)
from .invoice_line_classification import update_invoice_line_item_classification
from .invoice_line_items import (
    get_invoice_line_item_by_id,
    get_invoice_line_items_by_invoice_id,
    replace_invoice_extracted_line_items,
)
from .invoice_line_normalization import update_invoice_line_item_normalization
from .invoice_status import update_invoice_status
from .line_corrections import (
    insert_line_correction,
    list_line_corrections_by_line_item_id,
)
from .models import (
    AnafSyncLog,
    AnafToken,
    Base,
    BenchmarkObservation,
    BenchmarkSourceKind,
    CanonicalProduct,
    CorrectionKind,
    Farm,
    FarmMembership,
    FarmMembershipRole,
    Invoice,
    InvoiceAlertRecord,
    InvoiceExplanationRecord,
    InvoiceLineItem,
    InvoiceStatus,
    LineClassification,
    LineCorrection,
    ProductAlias,
    SourceType,
    StockMovement,
    StockMovementDirection,
    Supplier,
    UploadedDocument,
    User,
)
from .normalization_lookup import list_exact_normalization_candidates
from .product_aliases import (
    list_precedence_ordered_visible_aliases,
    list_product_aliases_by_alias_text,
    list_product_aliases_by_canonical_product_id,
    list_visible_product_aliases_by_alias_text,
)
from .session import async_session, get_db, get_engine
from .stock_movements import (
    StockBalance,
    get_stock_balances,
    get_stock_movements_for_product,
    insert_stock_movement_idempotent,
    list_stock_movements_by_invoice_id,
)

__all__ = [
    # Base
    "Base",
    # Enums
    "SourceType",
    "InvoiceStatus",
    "LineClassification",
    "BenchmarkSourceKind",
    "StockMovementDirection",
    "CorrectionKind",
    "FarmMembershipRole",
    # Models
    "Farm",
    "User",
    "FarmMembership",
    "Supplier",
    "UploadedDocument",
    "Invoice",
    "CanonicalProduct",
    "InvoiceLineItem",
    "ProductAlias",
    "BenchmarkObservation",
    "StockMovement",
    "LineCorrection",
    "AnafToken",
    "AnafSyncLog",
    "InvoiceAlertRecord",
    "InvoiceExplanationRecord",
    # Session
    "get_db",
    "get_engine",
    "async_session",
    # Encryption
    "encrypt_token",
    "decrypt_token",
    # Query helpers — ANAF tokens
    "upsert_anaf_token",
    "get_anaf_token_by_farm",
    "get_decrypted_tokens",
    "list_all_active_tokens",
    "update_refreshed_tokens",
    "delete_anaf_token",
    "needs_refresh",
    # Query helpers — ANAF sync log
    "insert_sync_log",
    "complete_sync_log",
    "is_already_downloaded",
    "get_last_successful_sync",
    "list_sync_logs",
    # Query helpers — invoice intake
    "insert_uploaded_document",
    "insert_invoice_shell",
    "get_invoice_shell_by_id",
    "get_uploaded_document_by_id",
    "list_invoices_by_farm",
    "count_invoices_by_status",
    # Query helpers — invoice extraction
    "get_invoice_for_extraction_by_id",
    "update_invoice_extraction",
    # Query helpers — invoice line items
    "replace_invoice_extracted_line_items",
    "get_invoice_line_items_by_invoice_id",
    "get_invoice_line_item_by_id",
    # Query helpers — invoice status
    "update_invoice_status",
    # Query helpers — invoice line classification
    "update_invoice_line_item_classification",
    # Query helpers — invoice line normalization
    "update_invoice_line_item_normalization",
    # Query helpers — invoice duplicate candidates
    "list_invoice_duplicate_candidates",
    # Query helpers — canonical products
    "get_canonical_product_by_id",
    "list_canonical_products",
    # Query helpers — product aliases
    "list_product_aliases_by_canonical_product_id",
    "list_product_aliases_by_alias_text",
    "list_visible_product_aliases_by_alias_text",
    "list_precedence_ordered_visible_aliases",
    # Query helpers — normalization lookup
    "list_exact_normalization_candidates",
    # Query helpers — benchmark observations
    "insert_benchmark_observation",
    "insert_benchmark_observations_batch",
    "list_benchmark_observations",
    "list_benchmark_observations_by_provenance",
    # Query helpers — stock movements
    "StockBalance",
    "get_stock_balances",
    "get_stock_movements_for_product",
    "insert_stock_movement_idempotent",
    "list_stock_movements_by_invoice_id",
    # Query helpers — line corrections
    "insert_line_correction",
    "list_line_corrections_by_line_item_id",
    # Query helpers — invoice alerts
    "persist_invoice_alerts",
    "get_alerts_by_invoice_id",
    "delete_alerts_by_invoice_id",
    "count_alerts_by_invoice_ids",
    # Query helpers — invoice explanations
    "persist_invoice_explanations",
    "get_explanations_by_invoice_id",
    "delete_explanations_by_invoice_id",
]
