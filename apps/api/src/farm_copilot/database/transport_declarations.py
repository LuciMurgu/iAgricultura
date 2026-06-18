"""CRUD helpers for transport declarations (e-Transport)."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.models import (
    TransportDeclaration,
    TransportDeclarationItem,
)


async def create_transport_declaration(
    session: AsyncSession,
    **kwargs: object,
) -> TransportDeclaration:
    """Create a new transport declaration in draft status."""
    declaration = TransportDeclaration(**kwargs)
    session.add(declaration)
    await session.flush()
    return declaration


async def get_transport_declaration(
    session: AsyncSession,
    *,
    declaration_id: UUID,
    farm_id: UUID,
) -> TransportDeclaration | None:
    """Fetch a declaration with farm isolation."""
    result = await session.execute(
        select(TransportDeclaration).where(
            TransportDeclaration.id == declaration_id,
            TransportDeclaration.farm_id == farm_id,
        )
    )
    return result.scalar_one_or_none()


async def list_transport_declarations(
    session: AsyncSession,
    *,
    farm_id: UUID,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[TransportDeclaration]:
    """List declarations for a farm, optionally filtered by status."""
    stmt = (
        select(TransportDeclaration)
        .where(TransportDeclaration.farm_id == farm_id)
        .order_by(TransportDeclaration.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status:
        stmt = stmt.where(TransportDeclaration.anaf_status == status)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_declaration_anaf_response(
    session: AsyncSession,
    *,
    declaration_id: UUID,
    upload_index: str | None = None,
    uit_code: str | None = None,
    uit_valid_from: date | None = None,
    uit_valid_until: date | None = None,
    anaf_status: str = "ok",
    anaf_errors: str | None = None,
    raw_xml: str | None = None,
) -> None:
    """Update declaration with ANAF response data."""
    result = await session.execute(
        select(TransportDeclaration).where(
            TransportDeclaration.id == declaration_id
        )
    )
    declaration = result.scalar_one_or_none()
    if declaration is None:
        return

    if upload_index is not None:
        declaration.upload_index = upload_index
    if uit_code is not None:
        declaration.uit_code = uit_code
    if uit_valid_from is not None:
        declaration.uit_valid_from = uit_valid_from
    if uit_valid_until is not None:
        declaration.uit_valid_until = uit_valid_until
    declaration.anaf_status = anaf_status
    if anaf_errors is not None:
        declaration.anaf_errors = anaf_errors
    if raw_xml is not None:
        declaration.raw_xml = raw_xml

    await session.flush()


async def add_declaration_item(
    session: AsyncSession,
    **kwargs: object,
) -> TransportDeclarationItem:
    """Add a goods line item to a declaration."""
    item = TransportDeclarationItem(**kwargs)
    session.add(item)
    await session.flush()
    return item


async def get_declaration_items(
    session: AsyncSession,
    *,
    declaration_id: UUID,
) -> list[TransportDeclarationItem]:
    """Get all line items for a declaration, ordered by line_order."""
    result = await session.execute(
        select(TransportDeclarationItem)
        .where(TransportDeclarationItem.declaration_id == declaration_id)
        .order_by(TransportDeclarationItem.line_order)
    )
    return list(result.scalars().all())
