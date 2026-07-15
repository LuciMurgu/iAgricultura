"""/api/v1/alerts — farm-scoped alert listing."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import (
    AlertListItem,
    AlertListResponse,
)
from farm_copilot.database.invoice_alerts import list_alerts_by_farm

router = APIRouter(prefix="/alerts")


@router.get("", response_model=AlertListResponse)
async def api_alert_list(
    severity: str | None = None,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> AlertListResponse:
    """List alerts for the farm, optionally filtered by severity."""
    alerts = await list_alerts_by_farm(
        session,
        farm_id=api_user.farm_id,
        severity=severity,
    )

    items = [
        AlertListItem.model_validate(a) for a in alerts
    ]

    return AlertListResponse(items=items, total=len(items))
