"""Dashboard data aggregation — assembles the daily action feed."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.models import (
    AnafSyncLog,
    AnafToken,
    Invoice,
    InvoiceAlertRecord,
)

_MAX_ACTION_ITEMS = 5


@dataclass
class ActionItem:
    """A single item in the daily action feed."""

    priority: int  # 1=critical, 2=warning, 3=info
    icon: str
    title: str
    detail: str
    action_url: str
    action_label: str
    category: str  # "alert" | "review" | "sync" | "token"


@dataclass
class DashboardData:
    """Everything the dashboard template needs."""

    farm_name: str
    user_name: str
    farm_id: str

    # Counts
    total_invoices: int = 0
    invoices_needing_review: int = 0
    unresolved_alerts: int = 0
    recent_invoices_count: int = 0  # last 7 days

    # ANAF status
    anaf_connected: bool = False
    anaf_last_sync: datetime | None = None
    anaf_token_warning: str | None = None

    # The action feed — sorted by priority
    action_items: list[ActionItem] = field(default_factory=list)


async def build_dashboard_data(
    session: AsyncSession,
    *,
    farm_id: UUID,
    farm_name: str,
    user_name: str,
) -> DashboardData:
    """Assemble dashboard data from multiple queries."""
    data = DashboardData(
        farm_name=farm_name,
        user_name=user_name,
        farm_id=str(farm_id),
    )

    # ── Counts ───────────────────────────────────────────────────────
    data.total_invoices = await _count_invoices(session, farm_id)
    data.invoices_needing_review = await _count_invoices(
        session, farm_id, status="needs_review"
    )
    data.unresolved_alerts = await _count_unresolved_alerts(session, farm_id)

    seven_days_ago = datetime.now(tz=UTC) - timedelta(days=7)
    data.recent_invoices_count = await _count_recent_invoices(
        session, farm_id, since=seven_days_ago
    )

    # ── ANAF status ──────────────────────────────────────────────────
    anaf_token = await _get_anaf_token(session, farm_id)
    data.anaf_connected = anaf_token is not None

    if anaf_token is not None:
        last_sync = await _get_last_sync_time(session, farm_id)
        data.anaf_last_sync = last_sync

    # ── Action items ─────────────────────────────────────────────────
    items: list[ActionItem] = []

    # 1. Critical alerts (priority 1)
    critical = await _get_invoices_with_alerts(
        session, farm_id, severity="critical", limit=3
    )
    for inv_id, inv_number, count in critical:
        items.append(
            ActionItem(
                priority=1,
                icon="🚨",
                title=f"Critical alert: {inv_number or 'Invoice'}",
                detail=(
                    f"{count} critical issue{'s' if count > 1 else ''}"
                    " detected. Review immediately."
                ),
                action_url=f"/invoice/{inv_id}",
                action_label="Review now",
                category="alert",
            )
        )

    # 2. Warning alerts (priority 2)
    warnings = await _get_invoices_with_alerts(
        session, farm_id, severity="warning", limit=3
    )
    for inv_id, inv_number, count in warnings:
        items.append(
            ActionItem(
                priority=2,
                icon="⚠️",
                title=f"Price alert on {inv_number or 'invoice'}",
                detail=f"{count} price anomal{'ies' if count > 1 else 'y'} detected.",
                action_url=f"/invoice/{inv_id}",
                action_label="Review alerts",
                category="alert",
            )
        )

    # 3. Review invoices without alerts (priority 2)
    review_only = await _get_review_invoices_without_alerts(
        session, farm_id, limit=3
    )
    for inv_id, inv_number in review_only:
        items.append(
            ActionItem(
                priority=2,
                icon="📋",
                title=f"Invoice {inv_number or '—'} needs review",
                detail="Product mapping or classification requires your input.",
                action_url=f"/invoice/{inv_id}",
                action_label="Review",
                category="review",
            )
        )

    # 4. ANAF token expiring (priority 2)
    if anaf_token is not None:
        now = datetime.now(tz=UTC)
        days_left = (anaf_token.refresh_token_expires_at - now).days
        if days_left <= 30:
            data.anaf_token_warning = (
                f"Expires in {days_left} day{'s' if days_left != 1 else ''}"
            )
            items.append(
                ActionItem(
                    priority=2,
                    icon="🔑",
                    title="ANAF connection expiring soon",
                    detail=f"Your ANAF connection expires in {days_left} days. Re-authorize.",
                    action_url=f"/anaf/status/{farm_id}",
                    action_label="Manage connection",
                    category="token",
                )
            )

    # 5. ANAF not connected (priority 3)
    if anaf_token is None:
        items.append(
            ActionItem(
                priority=3,
                icon="🔗",
                title="Connect to ANAF for automatic invoices",
                detail="Link your ANAF account to receive invoices automatically.",
                action_url=f"/anaf/status/{farm_id}",
                action_label="Connect now",
                category="sync",
            )
        )

    # 6. Recent sync results (priority 3)
    if data.anaf_connected:
        recent_synced = await _count_recent_synced_invoices(
            session, farm_id, since=seven_days_ago
        )
        if recent_synced > 0:
            items.append(
                ActionItem(
                    priority=3,
                    icon="📥",
                    title=(
                        f"{recent_synced} new"
                        f" invoice{'s' if recent_synced > 1 else ''}"
                        " from ANAF"
                    ),
                    detail=(
                        "Last sync: "
                        + (
                            data.anaf_last_sync.strftime("%d.%m.%Y %H:%M")
                            if data.anaf_last_sync
                            else "unknown"
                        )
                    ),
                    action_url="/invoices?status=needs_review",
                    action_label="View new invoices",
                    category="sync",
                )
            )

    # Sort by priority, take top N
    items.sort(key=lambda x: x.priority)
    data.action_items = items[:_MAX_ACTION_ITEMS]

    return data


# ---------------------------------------------------------------------------
# Private query helpers
# ---------------------------------------------------------------------------


async def _count_invoices(
    session: AsyncSession,
    farm_id: UUID,
    status: str | None = None,
) -> int:
    """Count invoices, optionally filtered by status."""
    filters = [Invoice.farm_id == farm_id]
    if status is not None:
        filters.append(Invoice.status == status)
    result = await session.execute(
        select(func.count()).select_from(Invoice).where(*filters)
    )
    return result.scalar_one()


async def _count_unresolved_alerts(
    session: AsyncSession, farm_id: UUID
) -> int:
    """Count alerts on invoices that still need review."""
    result = await session.execute(
        select(func.count())
        .select_from(InvoiceAlertRecord)
        .join(Invoice, InvoiceAlertRecord.invoice_id == Invoice.id)
        .where(
            InvoiceAlertRecord.farm_id == farm_id,
            Invoice.status == "needs_review",
        )
    )
    return result.scalar_one()


async def _count_recent_invoices(
    session: AsyncSession, farm_id: UUID, *, since: datetime
) -> int:
    """Count invoices created since a given date."""
    result = await session.execute(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.farm_id == farm_id, Invoice.created_at >= since)
    )
    return result.scalar_one()


async def _get_anaf_token(
    session: AsyncSession, farm_id: UUID
) -> AnafToken | None:
    """Get ANAF token for this farm."""
    result = await session.execute(
        select(AnafToken).where(AnafToken.farm_id == farm_id)
    )
    return result.scalar_one_or_none()


async def _get_last_sync_time(
    session: AsyncSession, farm_id: UUID
) -> datetime | None:
    """Get last successful sync time."""
    result = await session.execute(
        select(AnafSyncLog.started_at)
        .where(
            AnafSyncLog.farm_id == farm_id,
            AnafSyncLog.status == "success",
        )
        .order_by(AnafSyncLog.started_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_invoices_with_alerts(
    session: AsyncSession,
    farm_id: UUID,
    *,
    severity: str,
    limit: int = 3,
) -> list[tuple[UUID, str | None, int]]:
    """Invoices with alerts of given severity needing review.

    Returns list of (invoice_id, invoice_number, alert_count).
    """
    stmt = (
        select(
            Invoice.id,
            Invoice.invoice_number,
            func.count(InvoiceAlertRecord.id).label("cnt"),
        )
        .join(InvoiceAlertRecord, Invoice.id == InvoiceAlertRecord.invoice_id)
        .where(
            Invoice.farm_id == farm_id,
            Invoice.status == "needs_review",
            InvoiceAlertRecord.severity == severity,
        )
        .group_by(Invoice.id, Invoice.invoice_number)
        .order_by(func.count(InvoiceAlertRecord.id).desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return [(row[0], row[1], row[2]) for row in result.all()]


async def _get_review_invoices_without_alerts(
    session: AsyncSession, farm_id: UUID, *, limit: int = 3
) -> list[tuple[UUID, str | None]]:
    """Invoices needing review that don't have any alerts."""
    # Subquery: invoice IDs that have alerts
    alert_invoice_ids = (
        select(InvoiceAlertRecord.invoice_id)
        .where(InvoiceAlertRecord.farm_id == farm_id)
        .distinct()
        .subquery()
    )
    stmt = (
        select(Invoice.id, Invoice.invoice_number)
        .where(
            Invoice.farm_id == farm_id,
            Invoice.status == "needs_review",
            Invoice.id.notin_(select(alert_invoice_ids.c.invoice_id)),
        )
        .order_by(Invoice.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def _count_recent_synced_invoices(
    session: AsyncSession, farm_id: UUID, *, since: datetime
) -> int:
    """Count invoices imported via ANAF sync since a given date."""
    result = await session.execute(
        select(func.count())
        .select_from(AnafSyncLog)
        .where(
            AnafSyncLog.farm_id == farm_id,
            AnafSyncLog.status == "success",
            AnafSyncLog.invoice_id.isnot(None),
            AnafSyncLog.started_at >= since,
        )
    )
    return result.scalar_one()
