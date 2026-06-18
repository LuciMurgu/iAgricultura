"""SQLAlchemy 2.0 models — faithful port of the TypeScript/Drizzle schema.

10 tables, 6 enums.  All tables use UUID primary keys and timestamptz.
Decimal columns follow the project convention:
  - Money (totals): Numeric(15, 2)
  - Quantities / prices: Numeric(15, 4)
  - Confidence: Numeric(4, 3)
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSON, TIMESTAMP, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


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


def _enum_values(enum_cls: type[enum.StrEnum]) -> list[str]:
    """Return enum member values — used as ``values_callable`` for SA Enum."""
    return [e.value for e in enum_cls]


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Shared declarative base for all models."""

    type_annotation_map = {
        uuid.UUID: UUID(as_uuid=True),
        Decimal: Numeric(15, 2),
    }


# ---------------------------------------------------------------------------
# Helper columns
# ---------------------------------------------------------------------------

def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )


def _created_at() -> Mapped[datetime]:
    return mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


def _updated_at() -> Mapped[datetime]:
    return mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class FarmMembershipRole(enum.StrEnum):
    OWNER = "owner"
    MEMBER = "member"
    VIEWER = "viewer"


# ---------------------------------------------------------------------------
# 1. farms
# ---------------------------------------------------------------------------


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String, nullable=False)
    cif: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    # relationships
    suppliers: Mapped[list[Supplier]] = relationship(back_populates="farm")
    documents: Mapped[list[UploadedDocument]] = relationship(back_populates="farm")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="farm")


# ---------------------------------------------------------------------------
# 1b. users
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 1c. farm_memberships
# ---------------------------------------------------------------------------


class FarmMembership(Base):
    __tablename__ = "farm_memberships"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "farm_id", name="uq_farm_memberships_user_farm"
        ),
        Index("ix_farm_memberships_user_id", "user_id"),
        Index("ix_farm_memberships_farm_id", "farm_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    role: Mapped[FarmMembershipRole] = mapped_column(
        Enum(
            FarmMembershipRole,
            name="farm_membership_role",
            create_constraint=True,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = _created_at()


# ---------------------------------------------------------------------------
# 2. suppliers
# ---------------------------------------------------------------------------


class Supplier(Base):
    __tablename__ = "suppliers"
    __table_args__ = (
        UniqueConstraint("id", "farm_id", name="uq_suppliers_id_farm_id"),
        Index("ix_suppliers_farm_id", "farm_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    tax_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    farm: Mapped[Farm] = relationship(back_populates="suppliers")


# ---------------------------------------------------------------------------
# 3. uploaded_documents
# ---------------------------------------------------------------------------


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"
    __table_args__ = (
        UniqueConstraint("id", "farm_id", name="uq_uploaded_documents_id_farm_id"),
        Index("ix_uploaded_documents_farm_id", "farm_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(
            SourceType,
            name="source_type",
            create_constraint=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    original_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    farm: Mapped[Farm] = relationship(back_populates="documents")


# ---------------------------------------------------------------------------
# 4. invoices
# ---------------------------------------------------------------------------


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        ForeignKeyConstraint(
            ["uploaded_document_id", "farm_id"],
            ["uploaded_documents.id", "uploaded_documents.farm_id"],
            name="fk_invoices_uploaded_document",
        ),
        ForeignKeyConstraint(
            ["supplier_id", "farm_id"],
            ["suppliers.id", "suppliers.farm_id"],
            name="fk_invoices_supplier",
        ),
        UniqueConstraint("uploaded_document_id", name="uq_invoices_uploaded_document_id"),
        Index("ix_invoices_farm_id", "farm_id"),
        Index("ix_invoices_supplier_id", "supplier_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    uploaded_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(
            InvoiceStatus,
            name="invoice_status",
            create_constraint=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        server_default=InvoiceStatus.UPLOADED.value,
    )
    invoice_number: Mapped[str | None] = mapped_column(String, nullable=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String, nullable=False, server_default="RON")
    subtotal_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    tax_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    total_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    raw_extraction_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # type: ignore[type-arg]
    extraction_method: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    farm: Mapped[Farm] = relationship(back_populates="invoices")
    line_items: Mapped[list[InvoiceLineItem]] = relationship(back_populates="invoice")


# ---------------------------------------------------------------------------
# 5. canonical_products  (GLOBAL — no farm_id)
# ---------------------------------------------------------------------------


class CanonicalProduct(Base):
    __tablename__ = "canonical_products"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    default_unit: Mapped[str | None] = mapped_column(String, nullable=True)
    nc_code: Mapped[str | None] = mapped_column(String(8), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 6. invoice_line_items
# ---------------------------------------------------------------------------


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    __table_args__ = (
        UniqueConstraint(
            "invoice_id", "line_order", name="uq_invoice_line_items_invoice_id_line_order"
        ),
        Index("ix_invoice_line_items_invoice_id", "invoice_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    line_order: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(15, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 4), nullable=True)
    line_total: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    line_classification: Mapped[LineClassification | None] = mapped_column(
        Enum(
            LineClassification,
            name="line_classification",
            create_constraint=True,
            values_callable=_enum_values,
        ),
        nullable=True,
    )
    canonical_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"), nullable=True
    )
    normalization_confidence: Mapped[Decimal | None] = mapped_column(
        Numeric(4, 3), nullable=True
    )
    normalization_method: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    invoice: Mapped[Invoice] = relationship(back_populates="line_items")
    canonical_product: Mapped[CanonicalProduct | None] = relationship()


# ---------------------------------------------------------------------------
# 7. product_aliases
# ---------------------------------------------------------------------------


class ProductAlias(Base):
    __tablename__ = "product_aliases"
    __table_args__ = (
        Index("ix_product_aliases_canonical_product_id", "canonical_product_id"),
        Index("ix_product_aliases_alias_text", "alias_text"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    canonical_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"), nullable=False
    )
    alias_text: Mapped[str] = mapped_column(String, nullable=False)
    farm_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=True
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True
    )
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = _created_at()


# ---------------------------------------------------------------------------
# 7b. product_embeddings
# ---------------------------------------------------------------------------


class ProductEmbedding(Base):
    __tablename__ = "product_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "canonical_product_id",
            name="uq_product_embeddings_product",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    canonical_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"),
        nullable=False,
    )
    embedding: Mapped[list] = mapped_column(
        Vector(384), nullable=False,  # all-MiniLM-L6-v2 dimension
    )
    model_name: Mapped[str] = mapped_column(
        String, nullable=False, server_default="all-MiniLM-L6-v2",
    )
    text_source: Mapped[str] = mapped_column(
        Text, nullable=False,
    )
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 8. benchmark_observations
# ---------------------------------------------------------------------------


class BenchmarkObservation(Base):
    __tablename__ = "benchmark_observations"
    __table_args__ = (
        Index("ix_benchmark_observations_farm_id", "farm_id"),
        Index("ix_benchmark_observations_canonical_product_id", "canonical_product_id"),
        Index("ix_benchmark_observations_observed_at", "observed_at"),
        Index("ix_benchmark_observations_source_kind", "source_kind"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    canonical_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"), nullable=False
    )
    source_kind: Mapped[BenchmarkSourceKind] = mapped_column(
        Enum(
            BenchmarkSourceKind,
            name="benchmark_source_kind",
            create_constraint=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True
    )
    invoice_line_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoice_line_items.id"), nullable=True
    )
    observed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    region_county: Mapped[str | None] = mapped_column(String, nullable=True)
    region_name: Mapped[str | None] = mapped_column(String, nullable=True)
    normalized_unit: Mapped[str] = mapped_column(String, nullable=False)
    normalized_unit_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), nullable=False
    )
    currency: Mapped[str] = mapped_column(String, nullable=False, server_default="RON")
    ex_vat: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    freight_separated: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    source_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 9. stock_movements
# ---------------------------------------------------------------------------


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        UniqueConstraint(
            "farm_id", "idempotency_key", name="uq_stock_movements_farm_id_idempotency_key"
        ),
        Index("ix_stock_movements_farm_id", "farm_id"),
        Index("ix_stock_movements_canonical_product_id", "canonical_product_id"),
        Index("ix_stock_movements_invoice_id", "invoice_id"),
        Index("ix_stock_movements_effective_at", "effective_at"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    canonical_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"), nullable=False
    )
    direction: Mapped[StockMovementDirection] = mapped_column(
        Enum(
            StockMovementDirection,
            name="stock_movement_direction",
            create_constraint=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True
    )
    invoice_line_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoice_line_items.id"), nullable=True
    )
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 10. line_corrections
# ---------------------------------------------------------------------------


class LineCorrection(Base):
    __tablename__ = "line_corrections"
    __table_args__ = (
        Index("ix_line_corrections_farm_id", "farm_id"),
        Index("ix_line_corrections_invoice_id", "invoice_id"),
        Index("ix_line_corrections_invoice_line_item_id", "invoice_line_item_id"),
        Index("ix_line_corrections_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    invoice_line_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoice_line_items.id"), nullable=False
    )
    correction_kind: Mapped[CorrectionKind] = mapped_column(
        Enum(
            CorrectionKind,
            name="correction_kind",
            create_constraint=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    previous_canonical_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"), nullable=True
    )
    new_canonical_product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id"), nullable=False
    )
    previous_normalization_method: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    previous_normalization_confidence: Mapped[Decimal | None] = mapped_column(
        Numeric(4, 3), nullable=True
    )
    previous_raw_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str | None] = mapped_column(String, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = _created_at()


# ---------------------------------------------------------------------------
# 11. anaf_tokens
# ---------------------------------------------------------------------------


class AnafToken(Base):
    __tablename__ = "anaf_tokens"
    __table_args__ = (
        UniqueConstraint("farm_id", name="uq_anaf_tokens_farm_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    cif: Mapped[str] = mapped_column(String, nullable=False)
    client_id: Mapped[str] = mapped_column(String, nullable=False)
    client_secret_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    family_param: Mapped[str | None] = mapped_column(String, nullable=True)
    access_token_expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    refresh_token_expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    last_refreshed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 12. anaf_sync_log
# ---------------------------------------------------------------------------


class AnafSyncLog(Base):
    __tablename__ = "anaf_sync_log"
    __table_args__ = (
        UniqueConstraint(
            "farm_id",
            "anaf_id_descarcare",
            name="uq_anaf_sync_log_farm_descarcare",
        ),
        Index("ix_anaf_sync_log_farm_id", "farm_id"),
        Index("ix_anaf_sync_log_started_at", "started_at"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    sync_type: Mapped[str] = mapped_column(String, nullable=False)
    anaf_message_id: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    anaf_id_descarcare: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False)
    error_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_response_hash: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )


# ---------------------------------------------------------------------------
# 13. invoice_alerts
# ---------------------------------------------------------------------------


class InvoiceAlertRecord(Base):
    __tablename__ = "invoice_alerts"
    __table_args__ = (
        Index("ix_invoice_alerts_farm_id", "farm_id"),
        Index("ix_invoice_alerts_invoice_id", "invoice_id"),
        Index("ix_invoice_alerts_alert_key", "alert_key"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    alert_key: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    subject_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_id: Mapped[str] = mapped_column(String, nullable=False)
    reason_codes: Mapped[dict] = mapped_column(JSON, nullable=False)
    evidence: Mapped[dict] = mapped_column(JSON, nullable=False)
    confidence: Mapped[str] = mapped_column(String, nullable=False)
    recommended_action: Mapped[str] = mapped_column(
        String, nullable=False
    )
    created_at: Mapped[datetime] = _created_at()


# ---------------------------------------------------------------------------
# 14. invoice_explanations
# ---------------------------------------------------------------------------


class InvoiceExplanationRecord(Base):
    __tablename__ = "invoice_explanations"
    __table_args__ = (
        Index("ix_invoice_explanations_farm_id", "farm_id"),
        Index("ix_invoice_explanations_invoice_id", "invoice_id"),
        Index("ix_invoice_explanations_alert_id", "alert_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoice_alerts.id"),
        nullable=False,
    )
    explanation_kind: Mapped[str] = mapped_column(String, nullable=False)
    subject_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_id: Mapped[str] = mapped_column(String, nullable=False)
    line_order: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    what_happened: Mapped[str] = mapped_column(Text, nullable=False)
    data_used: Mapped[dict] = mapped_column(JSON, nullable=False)
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=False)
    support_strength: Mapped[str] = mapped_column(String, nullable=False)
    next_action: Mapped[str] = mapped_column(String, nullable=False)
    source_references: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = _created_at()


# ---------------------------------------------------------------------------
# 15. transport_declarations (e-Transport)
# ---------------------------------------------------------------------------


class TransportDeclaration(Base):
    """An e-Transport declaration for a shipment of goods."""

    __tablename__ = "transport_declarations"
    __table_args__ = (
        Index("ix_transport_declarations_farm_id", "farm_id"),
        Index("ix_transport_declarations_anaf_status", "anaf_status"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    farm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farms.id"), nullable=False
    )

    # Declaration identity
    reference: Mapped[str] = mapped_column(
        String(100), nullable=False  # e.g. "FC-2026-0042"
    )
    declaration_type: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="notification"
    )
    operation_type: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="10"
    )
    operation_scope: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="101"
    )
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Sender
    sender_cif: Mapped[str] = mapped_column(String(20), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False)
    sender_country: Mapped[str] = mapped_column(
        String(2), nullable=False, server_default="RO"
    )

    # Receiver
    receiver_cif: Mapped[str] = mapped_column(String(20), nullable=False)
    receiver_name: Mapped[str] = mapped_column(String(200), nullable=False)
    receiver_country: Mapped[str] = mapped_column(
        String(2), nullable=False, server_default="RO"
    )

    # Loading location
    load_country: Mapped[str] = mapped_column(
        String(2), nullable=False, server_default="RO"
    )
    load_county: Mapped[str | None] = mapped_column(String(2))
    load_city: Mapped[str] = mapped_column(String(100), nullable=False)
    load_street: Mapped[str | None] = mapped_column(String(200))
    load_postal_code: Mapped[str | None] = mapped_column(String(10))

    # Unloading location
    unload_country: Mapped[str] = mapped_column(
        String(2), nullable=False, server_default="RO"
    )
    unload_county: Mapped[str | None] = mapped_column(String(2))
    unload_city: Mapped[str] = mapped_column(String(100), nullable=False)
    unload_street: Mapped[str | None] = mapped_column(String(200))
    unload_postal_code: Mapped[str | None] = mapped_column(String(10))

    # Transport details
    vehicle_plate: Mapped[str | None] = mapped_column(String(20))
    carrier_cif: Mapped[str | None] = mapped_column(String(20))
    carrier_name: Mapped[str | None] = mapped_column(String(200))
    carrier_country: Mapped[str] = mapped_column(
        String(2), nullable=False, server_default="RO"
    )

    # ANAF response
    upload_index: Mapped[str | None] = mapped_column(String(100))
    uit_code: Mapped[str | None] = mapped_column(String(36))
    uit_valid_from: Mapped[date | None] = mapped_column(Date)
    uit_valid_until: Mapped[date | None] = mapped_column(Date)
    anaf_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="draft"
    )
    anaf_errors: Mapped[str | None] = mapped_column(Text)
    raw_xml: Mapped[str | None] = mapped_column(Text)

    # Provenance
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id")
    )

    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


# ---------------------------------------------------------------------------
# 16. transport_declaration_items
# ---------------------------------------------------------------------------


class TransportDeclarationItem(Base):
    """A line item (goods) within a transport declaration."""

    __tablename__ = "transport_declaration_items"
    __table_args__ = (
        UniqueConstraint(
            "declaration_id",
            "line_order",
            name="uq_transport_items_decl_line",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    declaration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transport_declarations.id", ondelete="CASCADE"),
        nullable=False,
    )
    line_order: Mapped[int] = mapped_column(Integer, nullable=False)

    # Product
    nc_tariff_code: Mapped[str] = mapped_column(String(8), nullable=False)
    product_description: Mapped[str] = mapped_column(
        String(500), nullable=False
    )
    canonical_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("canonical_products.id")
    )

    # Quantities
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), nullable=False
    )
    unit: Mapped[str] = mapped_column(String(10), nullable=False)
    net_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )
    gross_weight_kg: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )

    # Value
    value_ron: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False
    )
    operation_scope: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="101"
    )

    created_at: Mapped[datetime] = _created_at()

