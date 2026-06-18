"""Factory helpers for integration test fixtures."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.models import (
    BenchmarkObservation,
    CanonicalProduct,
    Farm,
    Invoice,
    InvoiceLineItem,
    ProductAlias,
    UploadedDocument,
)


async def seed_farm(
    session: AsyncSession, name: str = "Test Farm"
) -> Farm:
    """Insert a test farm."""
    farm = Farm(name=name)
    session.add(farm)
    await session.flush()
    return farm


async def seed_uploaded_document(
    session: AsyncSession,
    farm_id: UUID,
    source_type: str = "xml",
    storage_path: str = "/tmp/test.xml",
) -> UploadedDocument:
    """Insert a test uploaded document."""
    doc = UploadedDocument(
        farm_id=farm_id,
        source_type=source_type,
        storage_path=storage_path,
        original_filename="test.xml",
    )
    session.add(doc)
    await session.flush()
    return doc


async def seed_invoice(
    session: AsyncSession,
    farm_id: UUID,
    uploaded_document_id: UUID,
    **kwargs: object,
) -> Invoice:
    """Insert a test invoice shell."""
    invoice = Invoice(
        farm_id=farm_id,
        uploaded_document_id=uploaded_document_id,
        status=kwargs.pop("status", "uploaded"),
        invoice_number=kwargs.pop("invoice_number", None),
        invoice_date=kwargs.pop("invoice_date", None),
        currency=kwargs.pop("currency", "RON"),
        subtotal_amount=kwargs.pop("subtotal_amount", None),
        tax_amount=kwargs.pop("tax_amount", None),
        total_amount=kwargs.pop("total_amount", None),
        **kwargs,
    )
    session.add(invoice)
    await session.flush()
    return invoice


async def seed_line_item(
    session: AsyncSession,
    invoice_id: UUID,
    line_order: int,
    **kwargs: object,
) -> InvoiceLineItem:
    """Insert a test invoice line item."""
    item = InvoiceLineItem(
        invoice_id=invoice_id,
        line_order=line_order,
        **kwargs,
    )
    session.add(item)
    await session.flush()
    return item


async def seed_canonical_product(
    session: AsyncSession,
    name: str,
    **kwargs: object,
) -> CanonicalProduct:
    """Insert a test canonical product."""
    product = CanonicalProduct(
        name=name,
        active=kwargs.pop("active", True),
        **kwargs,
    )
    session.add(product)
    await session.flush()
    return product


async def seed_product_alias(
    session: AsyncSession,
    canonical_product_id: UUID,
    alias_text: str,
    farm_id: UUID | None = None,
    supplier_id: UUID | None = None,
    source: str | None = None,
) -> ProductAlias:
    """Insert a test product alias."""
    alias = ProductAlias(
        canonical_product_id=canonical_product_id,
        alias_text=alias_text,
        farm_id=farm_id,
        supplier_id=supplier_id,
        source=source,
    )
    session.add(alias)
    await session.flush()
    return alias


async def seed_benchmark_observation(
    session: AsyncSession,
    farm_id: UUID,
    canonical_product_id: UUID,
    normalized_unit_price: Decimal,
    **kwargs: object,
) -> BenchmarkObservation:
    """Insert a test benchmark observation."""
    obs = BenchmarkObservation(
        farm_id=farm_id,
        canonical_product_id=canonical_product_id,
        source_kind=kwargs.pop("source_kind", "invoice"),
        observed_at=kwargs.pop("observed_at", datetime.now(tz=UTC)),
        normalized_unit=kwargs.pop("normalized_unit", "KGM"),
        normalized_unit_price=normalized_unit_price,
        currency=kwargs.pop("currency", "RON"),
        **kwargs,
    )
    session.add(obs)
    await session.flush()
    return obs
