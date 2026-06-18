"""/api/v1 JSON API router — all endpoints for the SPA frontend.

Every endpoint returns JSON. No HTML, no redirects.
Reuses existing database/ and worker/ functions — zero business logic duplication.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.anaf_settings import anaf_settings
from farm_copilot.api.auth import (
    get_user_by_email,
    get_user_by_id,
    get_user_farms,
    verify_password,
)
from farm_copilot.api.dashboard import build_dashboard_data
from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import (
    AlertDetail,
    AlertListItem,
    AlertListResponse,
    AnafStatusResponse,
    AnafSyncResponse,
    BulkExportRequest,
    CorrectLineRequest,
    CorrectLineResponse,
    DashboardFeedItem,
    DashboardFeedResponse,
    ExplanationDetail,
    InvoiceDetailResponse,
    InvoiceLineItemDetail,
    InvoiceListItem,
    InvoiceListResponse,
    LoginRequest,
    LoginResponse,
    OkResponse,
    ReprocessResponse,
    StockBalanceItem,
    StockDetailResponse,
    StockListResponse,
    StockMovementItem,
    UserResponse,
)
from farm_copilot.contracts.procurement_review_models import (
    ProcurementReviewEvidenceItem,
    ProcurementReviewIssueResponse,
    ProcurementReviewResponse,
    ProcurementReviewSuggestedAction,
    ProcurementReviewSummaryResponse,
    ProcurementReviewUnsafeAction,
)
from farm_copilot.database.anaf_sync_log import list_sync_logs
from farm_copilot.database.anaf_tokens import (
    get_anaf_token_by_farm,
    needs_refresh,
)
from farm_copilot.database.canonical_products import get_canonical_product_by_id
from farm_copilot.database.invoice_alerts import (
    count_alerts_by_invoice_ids,
    get_alerts_by_invoice_id,
    list_alerts_by_farm,
)
from farm_copilot.database.invoice_explanations import (
    get_explanations_by_invoice_id,
)
from farm_copilot.database.invoice_intake import (
    count_invoices_by_status,
    get_invoice_shell_by_id,
    list_invoices_by_farm,
)
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)
from farm_copilot.database.procurement_review import (
    get_procurement_review_data,
)
from farm_copilot.database.stock_movements import (
    get_stock_balances,
    get_stock_movements_for_product,
)
from farm_copilot.domain.procurement_review import (
    ProcurementReviewInput,
    ReviewAlert,
    ReviewInvoiceLine,
    derive_procurement_review,
)
from farm_copilot.worker.anaf_client import (
    ANAF_TEST_BASE,
    AnafClient,
    AnafClientConfig,
)
from farm_copilot.worker.anaf_sync import run_anaf_sync
from farm_copilot.worker.line_correction import apply_unresolved_line_correction
from farm_copilot.worker.saga_export import (
    build_saga_export_invoice,
    generate_saga_xml,
    generate_saga_xml_batch,
)
from farm_copilot.worker.scheduler import scheduler_settings
from farm_copilot.worker.xml_invoice_processing import (
    resolve_xml_invoice_processing,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["api_v1"])

_PAGE_SIZE = 20


# ═══════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════


@router.post("/auth/login", response_model=LoginResponse)
async def api_login(
    request: Request,
    body: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Authenticate user, set session cookie, return user object."""
    user = await get_user_by_email(session, email=body.email)

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="Email sau parolă incorectă"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=401, detail="Contul este dezactivat"
        )

    # Set session — same as HTML login
    request.session["user_id"] = str(user.id)

    farms = await get_user_farms(session, user_id=user.id)
    farm_name = ""
    farm_id: UUID | None = None
    if farms:
        farm, _membership = farms[0]
        farm_id = farm.id
        farm_name = farm.name
        request.session["farm_id"] = str(farm.id)
        request.session["farm_name"] = farm.name
        request.session["farm_cif"] = farm.cif or ""
    request.session["user_name"] = user.name

    if farm_id is None:
        raise HTTPException(
            status_code=401, detail="Utilizatorul nu are nici o fermă"
        )

    return LoginResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            farm_id=farm_id,
            farm_name=farm_name,
        ),
    )


@router.post("/auth/logout", response_model=OkResponse)
async def api_logout(request: Request) -> OkResponse:
    """Clear session cookie."""
    request.session.clear()
    return OkResponse()


@router.get("/auth/me", response_model=LoginResponse)
async def api_me(
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Return current authenticated user."""
    user = await get_user_by_id(session, user_id=api_user.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Sesiune invalidă")

    return LoginResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            farm_id=api_user.farm_id,
            farm_name=api_user.farm_name,
        ),
    )


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/dashboard/feed", response_model=DashboardFeedResponse)
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


# ═══════════════════════════════════════════════════════════════════════════
# INVOICES
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/invoices", response_model=InvoiceListResponse)
async def api_invoice_list(
    status: str | None = None,
    page: int = 1,
    per_page: int = _PAGE_SIZE,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> InvoiceListResponse:
    """List invoices with pagination and status filter."""
    per_page = min(per_page, 100)  # cap
    offset = (max(page, 1) - 1) * per_page

    invoices, total_count = await list_invoices_by_farm(
        session, farm_id=api_user.farm_id, status=status,
        limit=per_page, offset=offset,
    )
    status_counts = await count_invoices_by_status(
        session, farm_id=api_user.farm_id,
    )

    # Batch alert counts
    invoice_ids = [inv.id for inv in invoices]
    alert_counts = await count_alerts_by_invoice_ids(
        session, invoice_ids=invoice_ids,
    )

    total_pages = max(1, (total_count + per_page - 1) // per_page)

    items = [
        InvoiceListItem(
            id=inv.id,
            status=(
                inv.status.value
                if hasattr(inv.status, "value") else str(inv.status)
            ),
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            currency=inv.currency,
            total_amount=inv.total_amount,
            alert_count=alert_counts.get(inv.id, 0),
            created_at=inv.created_at,
        )
        for inv in invoices
    ]

    return InvoiceListResponse(
        items=items,
        total=total_count,
        page=page,
        pages=total_pages,
        status_counts={k: v for k, v in status_counts.items()},
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
async def api_invoice_detail(
    invoice_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> InvoiceDetailResponse:
    """Get invoice detail with lines, alerts, explanations."""
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=api_user.farm_id,
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Factura nu a fost găsită")

    line_items = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=api_user.farm_id,
    )
    alert_records = await get_alerts_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=api_user.farm_id,
    )
    explanation_records = await get_explanations_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=api_user.farm_id,
    )

    status_val = (
        invoice.status.value
        if hasattr(invoice.status, "value") else str(invoice.status)
    )

    return InvoiceDetailResponse(
        id=invoice.id,
        farm_id=invoice.farm_id,
        status=status_val,
        invoice_number=invoice.invoice_number,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        subtotal_amount=invoice.subtotal_amount,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        extraction_method=invoice.extraction_method,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        line_items=[
            InvoiceLineItemDetail.model_validate(li) for li in line_items
        ],
        alerts=[
            AlertDetail.model_validate(a) for a in alert_records
        ],
        explanations=[
            ExplanationDetail.model_validate(e) for e in explanation_records
        ],
    )


@router.post(
    "/invoices/{invoice_id}/reprocess", response_model=ReprocessResponse
)
async def api_reprocess_invoice(
    invoice_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> ReprocessResponse:
    """Re-run the full pipeline for an invoice."""
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=api_user.farm_id,
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Factura nu a fost găsită")

    async with session.begin():
        await resolve_xml_invoice_processing(
            session, invoice_id=invoice_id, farm_id=api_user.farm_id,
        )

    # Re-fetch to get the new status
    updated = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=api_user.farm_id,
    )
    new_status = "unknown"
    if updated is not None:
        new_status = (
            updated.status.value
            if hasattr(updated.status, "value") else str(updated.status)
        )

    return ReprocessResponse(ok=True, new_status=new_status)


@router.post(
    "/invoices/{invoice_id}/correct-line",
    response_model=CorrectLineResponse,
)
async def api_correct_line(
    invoice_id: UUID,
    body: CorrectLineRequest,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> CorrectLineResponse:
    """Apply a line correction (manual product assignment)."""
    async with session.begin():
        await apply_unresolved_line_correction(
            session,
            invoice_id=invoice_id,
            farm_id=api_user.farm_id,
            line_item_id=body.line_item_id,
            new_canonical_product_id=body.canonical_product_id,
            actor="api_v1",
            reason=body.reason or None,
        )

    return CorrectLineResponse(
        ok=True,
        line_item_id=body.line_item_id,
        new_canonical_product_id=body.canonical_product_id,
    )


# ═══════════════════════════════════════════════════════════════════════════
# STOCK
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/stock", response_model=StockListResponse)
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


@router.get("/stock/{product_id}", response_model=StockDetailResponse)
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


# ═══════════════════════════════════════════════════════════════════════════
# SAGA EXPORT
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/export/saga/{invoice_id}")
async def api_export_saga_single(
    request: Request,
    invoice_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Download a single invoice as SAGA XML."""
    farm_name = request.session.get("farm_name", "")
    farm_cif = request.session.get("farm_cif", "")

    invoice = await build_saga_export_invoice(
        session,
        invoice_id=invoice_id,
        farm_id=api_user.farm_id,
        farm_name=farm_name,
        farm_cif=farm_cif,
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura nu a fost găsită")

    xml_content = generate_saga_xml(invoice)
    inv_num = invoice.invoice_number or str(invoice_id)
    inv_date = invoice.invoice_date or "nodate"
    filename = f"saga_{inv_num}_{inv_date}.xml"

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/saga/bulk")
async def api_export_saga_bulk(
    request: Request,
    body: BulkExportRequest,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Download multiple invoices as a single SAGA XML file."""
    farm_name = request.session.get("farm_name", "")
    farm_cif = request.session.get("farm_cif", "")

    invoices = []
    for inv_id in body.invoice_ids:
        saga_inv = await build_saga_export_invoice(
            session,
            invoice_id=inv_id,
            farm_id=api_user.farm_id,
            farm_name=farm_name,
            farm_cif=farm_cif,
        )
        if saga_inv:
            invoices.append(saga_inv)

    if not invoices:
        raise HTTPException(status_code=404, detail="Nici o factură găsită")

    xml_content = generate_saga_xml_batch(invoices)
    count = len(invoices)

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": (
                f'attachment; filename="saga_export_{count}_invoices.xml"'
            )
        },
    )


# ═══════════════════════════════════════════════════════════════════════════
# ANAF
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/anaf/status/{farm_id}", response_model=AnafStatusResponse)
async def api_anaf_status(
    farm_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> AnafStatusResponse:
    """ANAF connection status for a farm."""
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


@router.post("/anaf/sync/{farm_id}", response_model=AnafSyncResponse)
async def api_anaf_sync(
    farm_id: UUID,
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> AnafSyncResponse:
    """Trigger manual ANAF sync."""
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


# ═══════════════════════════════════════════════════════════════════════════
# PROCUREMENT REVIEW
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/procurement/review", response_model=ProcurementReviewResponse)
async def api_procurement_review(
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> ProcurementReviewResponse:
    """Procurement review summary from real invoice/alert/stock data.

    Transforms existing invoice pipeline data into a safe review summary.
    Farm-scoped via session auth — never exposes another farm's data.
    """
    now = datetime.now(tz=UTC)

    # Fetch farm-scoped data
    review_data = await get_procurement_review_data(
        session,
        farm_id=api_user.farm_id,
        farm_name=api_user.farm_name,
    )

    # Transform DB rows to domain input
    domain_lines = [
        ReviewInvoiceLine(
            line_item_id=ln.line_item_id,
            invoice_id=ln.invoice_id,
            invoice_number=ln.invoice_number,
            invoice_date=ln.invoice_date,
            supplier_name=ln.supplier_name,
            line_order=ln.line_order,
            raw_description=ln.raw_description,
            quantity=ln.quantity,
            unit=ln.unit,
            unit_price=ln.unit_price,
            line_total=ln.line_total,
            currency=ln.currency,
            line_classification=ln.line_classification,
            canonical_product_id=ln.canonical_product_id,
            canonical_product_name=ln.canonical_product_name,
            normalization_confidence=ln.normalization_confidence,
            normalization_method=ln.normalization_method,
            has_stock_movement=ln.has_stock_movement,
        )
        for ln in review_data.lines
    ]

    domain_alerts = [
        ReviewAlert(
            alert_id=a.alert_id,
            invoice_id=a.invoice_id,
            invoice_number=a.invoice_number,
            alert_key=a.alert_key,
            severity=a.severity,
            subject_type=a.subject_type,
            subject_id=a.subject_id,
            reason_codes=a.reason_codes,
            evidence=a.evidence,
            confidence=a.confidence,
            recommended_action=a.recommended_action,
        )
        for a in review_data.alerts
    ]

    domain_input = ProcurementReviewInput(
        farm_id=str(api_user.farm_id),
        farm_name=api_user.farm_name,
        lines=domain_lines,
        alerts=domain_alerts,
        total_invoices=review_data.total_invoices,
    )

    # Run pure domain logic
    result = derive_procurement_review(
        domain_input,
        generated_at=now.isoformat(),
    )

    # Serialize to response
    return ProcurementReviewResponse(
        farm_id=result.farm_id,
        farm_name=result.farm_name,
        generated_at=result.generated_at,
        source=result.source,
        summary=ProcurementReviewSummaryResponse(
            total_invoices_reviewed=result.summary.total_invoices_reviewed,
            issues_needing_review=result.summary.issues_needing_review,
            high_attention_issues=result.summary.high_attention_issues,
            product_match_uncertainty_count=result.summary.product_match_uncertainty_count,
            stock_evidence_count=result.summary.stock_evidence_count,
            possible_margin_attention_ron=result.summary.possible_margin_attention_ron,
        ),
        issues=[
            ProcurementReviewIssueResponse(
                id=issue.id,
                type=issue.type,
                severity=issue.severity,
                status=issue.status,
                title=issue.title,
                what_happened=issue.what_happened,
                why_it_matters=issue.why_it_matters,
                supplier_name=issue.supplier_name,
                product_name=issue.product_name,
                normalized_product_name=issue.normalized_product_name,
                invoice_id=issue.invoice_id,
                invoice_number=issue.invoice_number,
                invoice_date=issue.invoice_date,
                quantity=issue.quantity,
                unit=issue.unit,
                unit_price=issue.unit_price,
                currency=issue.currency,
                product_match_confidence=issue.product_match_confidence,
                evidence=[
                    ProcurementReviewEvidenceItem(
                        id=ev.id,
                        type=ev.type,
                        title=ev.title,
                        source=ev.source,
                        summary=ev.summary,
                        confidence=ev.confidence,
                        date=ev.date,
                    )
                    for ev in issue.evidence
                ],
                suggested_actions=[
                    ProcurementReviewSuggestedAction(
                        label=sa.label,
                        action_type=sa.action_type,
                        href=sa.href,
                        disabled_reason=sa.disabled_reason,
                    )
                    for sa in issue.suggested_actions
                ],
                unsafe_actions=[
                    ProcurementReviewUnsafeAction(
                        label=ua.label,
                        reason=ua.reason,
                    )
                    for ua in issue.unsafe_actions
                ],
                reviewer_roles=list(issue.reviewer_roles),
                disclaimer=issue.disclaimer,
            )
            for issue in result.issues
        ],
        disclaimer=result.disclaimer,
    )


# ═══════════════════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/alerts", response_model=AlertListResponse)
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
