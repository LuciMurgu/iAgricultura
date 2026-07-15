"""/api/v1/stock — movement-based stock balances and product history."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import (
    StockBalanceItem,
    StockDetailResponse,
    StockListResponse,
    StockMovementItem,
)
from farm_copilot.database.canonical_products import get_canonical_product_by_id
from farm_copilot.database.stock_movements import (
    get_stock_balances,
    get_stock_movements_for_product,
)

router = APIRouter(prefix="/stock")


@router.get("", response_model=StockListResponse)
async def api_stock_overview(
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> StockListResponse:
    """Stock balances for all products."""
    balances = await get_stock_balances(session, farm_id=api_user.farm_id)

    items = [
        StockBalanceItem(
            product_id=b.canonical_product_id,
            product_name=b.product_name,
            category=b.category,
            unit=b.unit,
            total_in=b.total_in,
            total_out=b.total_out,
            balance=b.balance,
            last_movement_at=b.last_movement_at,
        )
        for b in balances
    ]

    return StockListResponse(items=items, total_products=len(items))


@router.get("/{product_id}", response_model=StockDetailResponse)
async def api_stock_detail(
    product_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> StockDetailResponse:
    """Product detail with movement history."""
    product = await get_canonical_product_by_id(
        session, product_id=product_id,
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produs negăsit")

    movements = await get_stock_movements_for_product(
        session,
        farm_id=api_user.farm_id,
        canonical_product_id=product_id,
    )

    return StockDetailResponse(
        product_id=product.id,
        product_name=product.name,
        category=product.category,
        default_unit=product.default_unit,
        movements=[
            StockMovementItem.model_validate(m) for m in movements
        ],
    )
