"""/api/v1/dashboard — action feed for the dashboard page."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.dashboard import build_dashboard_data
from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import (
    DashboardFeedItem,
    DashboardFeedResponse,
)

router = APIRouter(prefix="/dashboard")


@router.get("/feed", response_model=DashboardFeedResponse)
async def api_dashboard_feed(
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> DashboardFeedResponse:
    """Return dashboard action feed as JSON."""
    data = await build_dashboard_data(
        session,
        farm_id=api_user.farm_id,
        farm_name=api_user.farm_name,
        user_name=api_user.user_name,
    )

    return DashboardFeedResponse(
        farm_name=data.farm_name,
        user_name=data.user_name,
        total_invoices=data.total_invoices,
        invoices_needing_review=data.invoices_needing_review,
        unresolved_alerts=data.unresolved_alerts,
        anaf_connected=data.anaf_connected,
        anaf_last_sync=data.anaf_last_sync,
        items=[
            DashboardFeedItem(
                priority=item.priority,
                icon=item.icon,
                title=item.title,
                detail=item.detail,
                action_url=item.action_url,
                action_label=item.action_label,
                category=item.category,
            )
            for item in data.action_items
        ],
    )
