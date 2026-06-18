"""ANAF routes — OAuth flow, connection status, manual sync, disconnect."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.anaf_settings import anaf_settings
from farm_copilot.api.deps import get_db
from farm_copilot.api.templates import templates
from farm_copilot.database.anaf_sync_log import list_sync_logs
from farm_copilot.database.anaf_tokens import (
    delete_anaf_token,
    get_anaf_token_by_farm,
    needs_refresh,
    upsert_anaf_token,
)
from farm_copilot.database.encryption import encrypt_token
from farm_copilot.worker.anaf_client import (
    ANAF_TEST_BASE,
    AnafClient,
    AnafClientConfig,
)
from farm_copilot.worker.anaf_sync import run_anaf_sync
from farm_copilot.worker.scheduler import scheduler_settings

router = APIRouter(prefix="/anaf", tags=["anaf"])

# ---------------------------------------------------------------------------
# OAuth state store (module-level dict — CSRF protection)
# DEC-0013: Acceptable for single-server MVP.
# ---------------------------------------------------------------------------
_oauth_state_store: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# GET /anaf/status/{farm_id}
# ---------------------------------------------------------------------------


@router.get("/status/{farm_id}", response_class=HTMLResponse)
async def anaf_status(
    request: Request,
    farm_id: UUID,
    msg: str | None = None,
    msg_type: str | None = None,
    session: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """Show ANAF connection status for a farm."""
    token = await get_anaf_token_by_farm(session, farm_id=farm_id)

    context: dict = {
        "farm_id": farm_id,
        "connected": token is not None,
        "flash_msg": msg,
        "flash_type": msg_type or "info",
        "sync_enabled": scheduler_settings.anaf_sync_enabled,
        "sync_interval_hours": (
            scheduler_settings.anaf_sync_interval_seconds // 3600
        ),
    }

    if token is not None:
        now = datetime.now(tz=UTC)

        # Access token status
        access_expired = now >= token.access_token_expires_at
        refresh_needed = await needs_refresh(session, farm_id=farm_id)

        if access_expired:
            access_status = "expired"
        elif refresh_needed:
            access_status = "needs_refresh"
        else:
            access_status = "valid"

        # Refresh token days remaining
        refresh_days = (
            token.refresh_token_expires_at - now
        ).days
        refresh_warning = refresh_days <= 30

        # Last sync
        sync_logs = await list_sync_logs(
            session, farm_id=farm_id, limit=10
        )
        last_sync = sync_logs[0].started_at if sync_logs else None

        context.update(
            {
                "cif": token.cif,
                "access_status": access_status,
                "access_expires": token.access_token_expires_at,
                "refresh_expires": token.refresh_token_expires_at,
                "refresh_days": refresh_days,
                "refresh_warning": refresh_warning,
                "last_sync": last_sync,
                "sync_logs": sync_logs,
            }
        )

    return templates.TemplateResponse(
        request=request,
        name="anaf_status.html",
        context=context,
    )


# ---------------------------------------------------------------------------
# GET /anaf/authorize/{farm_id}
# ---------------------------------------------------------------------------


@router.get("/authorize/{farm_id}")
async def anaf_authorize(
    farm_id: UUID,
    cif: str = "",
    session: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Start OAuth flow → redirect to ANAF login page."""
    if not cif.strip():
        return RedirectResponse(
            url=(
                f"/anaf/status/{farm_id}"
                "?msg=CIF+is+required&msg_type=error"
            ),
            status_code=303,
        )

    # Generate state parameter for CSRF
    state = secrets.token_urlsafe(32)
    _oauth_state_store[state] = {
        "farm_id": str(farm_id),
        "cif": cif.strip(),
    }

    # Build config based on test mode
    config = AnafClientConfig(
        base_url=ANAF_TEST_BASE if anaf_settings.anaf_test_mode
        else AnafClientConfig().base_url,
    )
    client = AnafClient(config)
    authorize_url = client.build_authorize_url(
        client_id=anaf_settings.anaf_client_id,
        redirect_uri=anaf_settings.anaf_redirect_uri,
    )
    # Append state to URL
    authorize_url += f"&state={state}"

    return RedirectResponse(url=authorize_url, status_code=302)


# ---------------------------------------------------------------------------
# GET /anaf/callback
# ---------------------------------------------------------------------------


@router.get("/callback")
async def anaf_callback(
    request: Request,
    code: str = "",
    state: str = "",
    session: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Handle OAuth callback from ANAF after user authorizes."""
    # Validate state (CSRF check)
    stored = _oauth_state_store.pop(state, None)
    if stored is None:
        return RedirectResponse(
            url="/?msg=Invalid+OAuth+state&msg_type=error",
            status_code=303,
        )

    farm_id = UUID(stored["farm_id"])
    cif = stored["cif"]

    if not code:
        return RedirectResponse(
            url=(
                f"/anaf/status/{farm_id}"
                "?msg=No+authorization+code+received&msg_type=error"
            ),
            status_code=303,
        )

    # Exchange code for tokens
    config = AnafClientConfig(
        base_url=ANAF_TEST_BASE if anaf_settings.anaf_test_mode
        else AnafClientConfig().base_url,
    )
    client = AnafClient(config)

    try:
        response = await client.exchange_code_for_tokens(
            code=code,
            client_id=anaf_settings.anaf_client_id,
            client_secret=anaf_settings.anaf_client_secret,
            redirect_uri=anaf_settings.anaf_redirect_uri,
        )
    finally:
        await client.close()

    if not response.is_success:
        return RedirectResponse(
            url=(
                f"/anaf/status/{farm_id}"
                f"?msg=Token+exchange+failed:+{response.status_code}"
                "&msg_type=error"
            ),
            status_code=303,
        )

    token_data = response.json
    now = datetime.now(tz=UTC)
    expires_in = token_data.get("expires_in", 3600)

    await upsert_anaf_token(
        session,
        farm_id=farm_id,
        cif=cif,
        client_id=anaf_settings.anaf_client_id,
        client_secret_encrypted=encrypt_token(
            anaf_settings.anaf_client_secret
        ),
        access_token_encrypted=encrypt_token(
            token_data["access_token"]
        ),
        refresh_token_encrypted=encrypt_token(
            token_data["refresh_token"]
        ),
        family_param=token_data.get("family"),
        access_token_expires_at=now + timedelta(seconds=expires_in),
        refresh_token_expires_at=now + timedelta(days=90),
    )
    await session.commit()

    return RedirectResponse(
        url=(
            f"/anaf/status/{farm_id}"
            "?msg=Connected+to+ANAF+successfully&msg_type=success"
        ),
        status_code=303,
    )


# ---------------------------------------------------------------------------
# POST /anaf/sync/{farm_id}
# ---------------------------------------------------------------------------


@router.post("/sync/{farm_id}")
async def anaf_sync_trigger(
    farm_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Trigger a manual ANAF sync."""
    token = await get_anaf_token_by_farm(session, farm_id=farm_id)
    if token is None:
        return RedirectResponse(
            url=(
                f"/anaf/status/{farm_id}"
                "?msg=Not+connected+to+ANAF&msg_type=error"
            ),
            status_code=303,
        )

    config = AnafClientConfig(
        base_url=ANAF_TEST_BASE if anaf_settings.anaf_test_mode
        else AnafClientConfig().base_url,
    )
    client = AnafClient(config)

    try:
        result = await run_anaf_sync(
            session,
            farm_id=farm_id,
            anaf_client=client,
        )
        await session.commit()
    finally:
        await client.close()

    msg = (
        f"Sync+completed:+{result.invoices_created}+invoices+"
        f"downloaded,+{result.skipped_duplicates}+duplicates+"
        f"skipped,+{result.errors}+errors"
    )
    return RedirectResponse(
        url=f"/anaf/status/{farm_id}?msg={msg}&msg_type=success",
        status_code=303,
    )


# ---------------------------------------------------------------------------
# POST /anaf/disconnect/{farm_id}
# ---------------------------------------------------------------------------


@router.post("/disconnect/{farm_id}")
async def anaf_disconnect(
    farm_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Revoke ANAF connection for a farm."""
    await delete_anaf_token(session, farm_id=farm_id)
    await session.commit()

    return RedirectResponse(
        url=(
            f"/anaf/status/{farm_id}"
            "?msg=Disconnected+from+ANAF&msg_type=info"
        ),
        status_code=303,
    )
