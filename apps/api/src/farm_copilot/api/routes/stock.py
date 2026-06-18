"""Stock routes — overview balances + product movement detail."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import get_current_farm_id, get_db
from farm_copilot.api.templates import templates
from farm_copilot.database.canonical_products import (
    get_canonical_product_by_id,
)
from farm_copilot.database.stock_movements import (
    get_stock_balances,
    get_stock_movements_for_product,
)

router = APIRouter(tags=["stock"])


@router.get("/stock", response_class=HTMLResponse)
async def stock_overview(
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Show current stock balances for all products."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)  # type: ignore[return-value]

    balances = await get_stock_balances(session, farm_id=farm_id)

    return templates.TemplateResponse(
        request=request,
        name="stock_overview.html",
        context={
            "balances": balances,
            "total_products": len(balances),
            "farm_id": str(farm_id),
        },
    )


@router.get("/stock/{product_id}", response_class=HTMLResponse)
async def stock_product_detail(
    request: Request,
    product_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Show movement history for a specific product."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)  # type: ignore[return-value]

    product = await get_canonical_product_by_id(
        session, product_id=product_id
    )
    if not product:
        return templates.TemplateResponse(
            request=request,
            name="stock_detail.html",
            context={
                "product": None,
                "movements": [],
                "error": "Product not found.",
            },
            status_code=404,
        )

    movements = await get_stock_movements_for_product(
        session,
        farm_id=farm_id,
        canonical_product_id=product_id,
    )

    return templates.TemplateResponse(
        request=request,
        name="stock_detail.html",
        context={
            "product": product,
            "movements": movements,
        },
    )
