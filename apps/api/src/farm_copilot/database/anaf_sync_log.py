"""ANAF sync log CRUD — audit trail for SPV ingestion operations."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AnafSyncLog


async def insert_sync_log(
    session: AsyncSession,
    *,
    farm_id: UUID,
    sync_type: str,
    anaf_message_id: str | None = None,
    anaf_id_descarcare: str | None = None,
    started_at: datetime,
) -> AnafSyncLog:
    """Create a sync log entry at the start of an operation."""
    log = AnafSyncLog(
        farm_id=farm_id,
        sync_type=sync_type,
        anaf_message_id=anaf_message_id,
        anaf_id_descarcare=anaf_id_descarcare,
        status="in_progress",
        started_at=started_at,
    )
    session.add(log)
    await session.flush()
    await session.refresh(log)
    return log


async def complete_sync_log(
    session: AsyncSession,
    *,
    sync_log_id: UUID,
    status: str,
    invoice_id: UUID | None = None,
    error_details: str | None = None,
    raw_response_hash: str | None = None,
) -> None:
    """Update a sync log entry when the operation completes."""
    stmt = (
        update(AnafSyncLog)
        .where(AnafSyncLog.id == sync_log_id)
        .values(
            status=status,
            invoice_id=invoice_id,
            error_details=error_details,
            raw_response_hash=raw_response_hash,
            completed_at=datetime.now(tz=UTC),
        )
    )
    await session.execute(stmt)
    await session.flush()


async def is_already_downloaded(
    session: AsyncSession,
    *,
    farm_id: UUID,
    anaf_id_descarcare: str,
) -> bool:
    """Check if an invoice with this id_descarcare has already been
    downloaded for this farm. Used for deduplication."""
    stmt = select(AnafSyncLog.id).where(
        AnafSyncLog.farm_id == farm_id,
        AnafSyncLog.anaf_id_descarcare == anaf_id_descarcare,
        AnafSyncLog.status == "success",
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_last_successful_sync(
    session: AsyncSession,
    *,
    farm_id: UUID,
) -> datetime | None:
    """Get the timestamp of the last successful sync for a farm.

    Used to determine the polling window start.
    """
    stmt = (
        select(AnafSyncLog.started_at)
        .where(
            AnafSyncLog.farm_id == farm_id,
            AnafSyncLog.status == "success",
        )
        .order_by(AnafSyncLog.started_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_sync_logs(
    session: AsyncSession,
    *,
    farm_id: UUID,
    limit: int = 50,
) -> list[AnafSyncLog]:
    """List recent sync logs for a farm, most recent first."""
    stmt = (
        select(AnafSyncLog)
        .where(AnafSyncLog.farm_id == farm_id)
        .order_by(AnafSyncLog.started_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
