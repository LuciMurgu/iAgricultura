"""Map SQLAlchemy model instances to domain dataclass inputs."""

from __future__ import annotations

from farm_copilot.database.models import (
    CanonicalProduct,
    Invoice,
    InvoiceLineItem,
    ProductAlias,
)
from farm_copilot.domain.entities import (
    CanonicalProduct as DomainCanonicalProduct,
)
from farm_copilot.domain.entities import (
    Invoice as DomainInvoice,
)
from farm_copilot.domain.entities import (
    InvoiceLineItem as DomainLineItem,
)
from farm_copilot.domain.entities import (
    ProductAlias as DomainProductAlias,
)


def _str_or_none(val: object) -> str | None:
    """Convert a value to str, or None if it is None."""
    return str(val) if val is not None else None


def map_invoice(row: Invoice) -> DomainInvoice:
    """Map an SQLAlchemy Invoice to a domain Invoice."""
    return DomainInvoice(
        id=str(row.id),
        farm_id=str(row.farm_id),
        uploaded_document_id=str(row.uploaded_document_id),
        supplier_id=_str_or_none(row.supplier_id),
        status=row.status if isinstance(row.status, str) else row.status.value,
        invoice_number=row.invoice_number,
        invoice_date=(
            row.invoice_date.isoformat() if row.invoice_date is not None else None
        ),
        due_date=(
            row.due_date.isoformat() if row.due_date is not None else None
        ),
        currency=row.currency or "RON",
        subtotal_amount=row.subtotal_amount,
        tax_amount=row.tax_amount,
        total_amount=row.total_amount,
    )


def map_line_item(row: InvoiceLineItem) -> DomainLineItem:
    """Map an SQLAlchemy InvoiceLineItem to a domain InvoiceLineItem."""
    return DomainLineItem(
        id=str(row.id),
        invoice_id=str(row.invoice_id),
        line_order=row.line_order or 0,
        raw_description=row.raw_description,
        quantity=row.quantity,
        unit=row.unit,
        unit_price=row.unit_price,
        line_total=row.line_total,
        tax_rate=row.tax_rate,
        tax_amount=row.tax_amount,
        line_classification=(
            row.line_classification
            if isinstance(row.line_classification, str | None)
            else getattr(row.line_classification, "value", None)
        ),
        canonical_product_id=_str_or_none(row.canonical_product_id),
        normalization_confidence=row.normalization_confidence,
        normalization_method=row.normalization_method,
    )


def map_canonical_product(row: CanonicalProduct) -> DomainCanonicalProduct:
    """Map an SQLAlchemy CanonicalProduct to a domain CanonicalProduct."""
    return DomainCanonicalProduct(
        id=str(row.id),
        name=row.name,
        category=row.category,
        default_unit=row.default_unit,
        active=row.active,
    )


def map_product_alias(row: ProductAlias) -> DomainProductAlias:
    """Map an SQLAlchemy ProductAlias to a domain ProductAlias."""
    return DomainProductAlias(
        id=str(row.id),
        canonical_product_id=str(row.canonical_product_id),
        alias_text=row.alias_text,
        farm_id=_str_or_none(row.farm_id),
        supplier_id=_str_or_none(row.supplier_id),
        source=row.source,
    )
