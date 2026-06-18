"""Stock movement query helpers — idempotent insert + list + balances."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .models import CanonicalProduct, StockMovement


@dataclass
class StockBalance:
    """Computed stock balance for one product."""

    canonical_product_id: UUID
    product_name: str
    category: str | None
    unit: str
    total_in: Decimal
    total_out: Decimal
    last_movement_at: datetime | None

    @property
    def balance(self) -> Decimal:
        """Net balance = total_in - total_out."""
        return self.total_in - self.total_out


async def insert_stock_movement_idempotent(
    session: AsyncSession,
    *,
    farm_id: UUID,
    canonical_product_id: UUID,
    direction: str,
    quantity: Decimal,
    unit: str,
    idempotency_key: str,
    effective_at: datetime,
    invoice_id: UUID | None = None,
    invoice_line_item_id: UUID | None = None,
    notes: str | None = None,
) -> tuple[StockMovement, bool]:
    """Insert a stock movement with ON CONFLICT DO NOTHING on
    ``(farm_id, idempotency_key)``.

    Returns ``(row, created)`` where ``created=True`` if inserted,
    ``False`` if already existed.
    """
    stmt = (
        pg_insert(StockMovement)
        .values(
            farm_id=farm_id,
            canonical_product_id=canonical_product_id,
            direction=direction,
            quantity=quantity,
            unit=unit,
            idempotency_key=idempotency_key,
            effective_at=effective_at,
            invoice_id=invoice_id,
            invoice_line_item_id=invoice_line_item_id,
            notes=notes,
        )
        .on_conflict_do_nothing(
            index_elements=["farm_id", "idempotency_key"],
        )
        .returning(StockMovement)
    )

    result = await session.execute(stmt)
    row = result.scalar_one_or_none()

    if row is not None:
        return (row, True)

    # Conflict — fetch existing row
    existing = await session.execute(
        select(StockMovement).where(
            StockMovement.farm_id == farm_id,
            StockMovement.idempotency_key == idempotency_key,
        )
    )
    return (existing.scalar_one(), False)


async def list_stock_movements_by_invoice_id(
    session: AsyncSession,
    *,
    farm_id: UUID,
    invoice_id: UUID,
) -> list[StockMovement]:
    """List all stock movements linked to a specific invoice."""
    result = await session.execute(
        select(StockMovement)
        .where(
            StockMovement.farm_id == farm_id,
            StockMovement.invoice_id == invoice_id,
        )
        .order_by(StockMovement.effective_at)
    )
    return list(result.scalars().all())


async def get_stock_balances(
    session: AsyncSession,
    *,
    farm_id: UUID,
) -> list[StockBalance]:
    """Compute stock balances per product from movement aggregates.

    Balance = SUM(in quantities) - SUM(out quantities).
    Ordered by product name.
    """
    stmt = (
        select(
            StockMovement.canonical_product_id,
            CanonicalProduct.name,
            CanonicalProduct.category,
            StockMovement.unit,
            func.coalesce(
                func.sum(
                    case(
                        (StockMovement.direction == "in",
                         StockMovement.quantity),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_in"),
            func.coalesce(
                func.sum(
                    case(
                        (StockMovement.direction == "out",
                         StockMovement.quantity),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("total_out"),
            func.max(StockMovement.effective_at).label(
                "last_movement_at"
            ),
        )
        .join(
            CanonicalProduct,
            StockMovement.canonical_product_id == CanonicalProduct.id,
        )
        .where(StockMovement.farm_id == farm_id)
        .group_by(
            StockMovement.canonical_product_id,
            CanonicalProduct.name,
            CanonicalProduct.category,
            StockMovement.unit,
        )
        .order_by(CanonicalProduct.name)
    )
    result = await session.execute(stmt)
    return [
        StockBalance(
            canonical_product_id=row[0],
            product_name=row[1],
            category=row[2],
            unit=row[3],
            total_in=row[4],
            total_out=row[5],
            last_movement_at=row[6],
        )
        for row in result.all()
    ]


async def get_stock_movements_for_product(
    session: AsyncSession,
    *,
    farm_id: UUID,
    canonical_product_id: UUID,
    limit: int = 50,
) -> list[StockMovement]:
    """List recent movements for a specific product.

    Ordered by effective_at descending. Used for detail drill-down.
    """
    result = await session.execute(
        select(StockMovement)
        .where(
            StockMovement.farm_id == farm_id,
            StockMovement.canonical_product_id == canonical_product_id,
        )
        .order_by(StockMovement.effective_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
