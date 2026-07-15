"""/api/v1/invoices — list, detail, reprocess, line correction."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import (
    AlertDetail,
    CorrectLineRequest,
    CorrectLineResponse,
    ExplanationDetail,
    InvoiceDetailResponse,
    InvoiceLineItemDetail,
    InvoiceListItem,
    InvoiceListResponse,
    ReprocessResponse,
)
from farm_copilot.database.invoice_alerts import (
    count_alerts_by_invoice_ids,
    get_alerts_by_invoice_id,
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
from farm_copilot.worker.line_correction import apply_unresolved_line_correction
from farm_copilot.worker.xml_invoice_processing import (
    resolve_xml_invoice_processing,
)

router = APIRouter(prefix="/invoices")

_PAGE_SIZE = 20


@router.get("", response_model=InvoiceListResponse)
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


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
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
    "/{invoice_id}/reprocess", response_model=ReprocessResponse
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
    "/{invoice_id}/correct-line",
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
