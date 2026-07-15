"""/api/v1 JSON API — all endpoints for the SPA frontend.

Every endpoint returns JSON. No HTML, no redirects.
Reuses existing database/ and worker/ functions — zero business logic duplication.

One module per resource; this package assembles them into a single router
mounted at ``/api/v1`` by ``farm_copilot.api.app``.
"""

from __future__ import annotations

from fastapi import APIRouter

from farm_copilot.api.routes.api_v1.alerts import router as alerts_router
from farm_copilot.api.routes.api_v1.anaf import router as anaf_router
from farm_copilot.api.routes.api_v1.auth import router as auth_router
from farm_copilot.api.routes.api_v1.dashboard import router as dashboard_router
from farm_copilot.api.routes.api_v1.export import router as export_router
from farm_copilot.api.routes.api_v1.invoices import router as invoices_router
from farm_copilot.api.routes.api_v1.procurement import router as procurement_router
from farm_copilot.api.routes.api_v1.stock import router as stock_router

router = APIRouter(tags=["api_v1"])
router.include_router(auth_router)
router.include_router(dashboard_router)
router.include_router(invoices_router)
router.include_router(stock_router)
router.include_router(export_router)
router.include_router(anaf_router)
router.include_router(procurement_router)
router.include_router(alerts_router)

__all__ = ["router"]
