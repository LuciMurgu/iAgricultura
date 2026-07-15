"""/api/v1/anaf — e-Factura connection status and manual sync trigger."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.anaf_settings import anaf_settings
from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import (
    AnafStatusResponse,
    AnafSyncResponse,
)
from farm_copilot.database.anaf_sync_log import list_sync_logs
from farm_copilot.database.anaf_tokens import (
    get_anaf_token_by_farm,
    needs_refresh,
)
from farm_copilot.worker.anaf_client import (
    ANAF_TEST_BASE,
    AnafClient,
    AnafClientConfig,
)
from farm_copilot.worker.anaf_sync import run_anaf_sync
from farm_copilot.worker.scheduler import scheduler_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/anaf")


@router.get("/status/{farm_id}", response_model=AnafStatusResponse)
async def api_anaf_status(
    farm_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> AnafStatusResponse:
    """ANAF connection status for a farm."""
    if farm_id != api_user.farm_id:
        raise HTTPException(status_code=403, detail="Acces interzis la această fermă")

    token = await get_anaf_token_by_farm(session, farm_id=farm_id)

    if token is None:
        return AnafStatusResponse(
            connected=False,
            sync_enabled=scheduler_settings.anaf_sync_enabled,
            sync_interval_hours=(
                scheduler_settings.anaf_sync_interval_seconds // 3600
            ),
        )

    now = datetime.now(tz=UTC)
    access_valid = now < token.access_token_expires_at
    refresh_needed_flag = await needs_refresh(session, farm_id=farm_id)
    token_valid = access_valid and not refresh_needed_flag
    refresh_days = (token.refresh_token_expires_at - now).days

    sync_logs = await list_sync_logs(session, farm_id=farm_id, limit=1)
    last_sync = sync_logs[0].started_at if sync_logs else None

    return AnafStatusResponse(
        connected=True,
        last_sync=last_sync,
        cif=token.cif,
        token_valid=token_valid,
        refresh_days_remaining=refresh_days,
        sync_enabled=scheduler_settings.anaf_sync_enabled,
        sync_interval_hours=(
            scheduler_settings.anaf_sync_interval_seconds // 3600
        ),
    )


@router.post("/sync/{farm_id}", response_model=AnafSyncResponse)
async def api_anaf_sync(
    farm_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> AnafSyncResponse:
    """Trigger manual ANAF sync."""
    if farm_id != api_user.farm_id:
        raise HTTPException(status_code=403, detail="Acces interzis la această fermă")

    token = await get_anaf_token_by_farm(session, farm_id=farm_id)
    if token is None:
        raise HTTPException(
            status_code=400, detail="ANAF neconectat pentru această fermă"
        )

    config = AnafClientConfig(
        base_url=ANAF_TEST_BASE if anaf_settings.anaf_test_mode
        else AnafClientConfig().base_url,
    )
    client = AnafClient(config)

    try:
        result = await run_anaf_sync(
            session, farm_id=farm_id, anaf_client=client,
        )
        await session.commit()
    except Exception as exc:
        logger.exception("ANAF sync failed for farm %s", farm_id)
        raise HTTPException(
            status_code=502, detail=f"Sincronizare ANAF eșuată: {exc}"
        ) from exc
    finally:
        await client.close()

    return AnafSyncResponse(
        ok=True,
        invoices_created=result.invoices_created,
        duplicates_skipped=result.skipped_duplicates,
        errors=result.errors,
    )
