"""Invoice routes — list view, detail view, reprocess, correct line."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import get_current_farm_id, get_db
from farm_copilot.api.templates import templates
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

router = APIRouter()

_PAGE_SIZE = 50


@router.get("/invoices", response_class=HTMLResponse)
async def invoice_list(
    request: Request,
    status: str | None = None,
    page: int = 1,
    session: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    """List all invoices for the current farm."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)  # type: ignore[return-value]

    offset = (max(page, 1) - 1) * _PAGE_SIZE

    invoices, total_count = await list_invoices_by_farm(
        session, farm_id=farm_id, status=status, limit=_PAGE_SIZE, offset=offset
    )
    status_counts = await count_invoices_by_status(session, farm_id=farm_id)

    # Batch alert counts
    invoice_ids = [inv.id for inv in invoices]
    alert_counts = await count_alerts_by_invoice_ids(
        session, invoice_ids=invoice_ids
    )

    total_pages = max(1, (total_count + _PAGE_SIZE - 1) // _PAGE_SIZE)

    return templates.TemplateResponse(
        request=request,
        name="invoice_list.html",
        context={
            "invoices": invoices,
            "total_count": total_count,
            "status_counts": status_counts,
            "alert_counts": alert_counts,
            "current_status": status,
            "page": page,
            "total_pages": total_pages,
            "farm_id": str(farm_id),
        },
    )


@router.get("/invoice/{invoice_id}")
async def invoice_detail(
    request: Request,
    invoice_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> object:
    """Render the invoice detail page with lines, alerts, explanations."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)

    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return templates.TemplateResponse(
            request=request,
            name="upload.html",
            context={"error": "Invoice not found."},
            status_code=404,
        )

    line_items = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    alert_records = await get_alerts_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    explanation_records = await get_explanations_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    # Fuzzy suggestions for unresolved lines
    from farm_copilot.database.canonical_products import (
        list_canonical_products,
    )
    from farm_copilot.worker.fuzzy_suggestions import get_fuzzy_suggestions

    unresolved_suggestions: dict[str, object] = {}
    for line in line_items:
        if line.canonical_product_id is None and line.raw_description:
            suggestions = await get_fuzzy_suggestions(
                session, query_text=line.raw_description
            )
            if suggestions.suggestions:
                unresolved_suggestions[str(line.id)] = suggestions

    all_products = await list_canonical_products(
        session, active_only=True
    )

    return templates.TemplateResponse(
        request=request,
        name="invoice_detail.html",
        context={
            "invoice": invoice,
            "line_items": line_items,
            "alerts": alert_records,
            "explanations": explanation_records,
            "steps": None,
            "unresolved_suggestions": unresolved_suggestions,
            "all_products": all_products,
        },
    )


@router.post("/invoice/{invoice_id}/reprocess")
async def reprocess_invoice(
    request: Request,
    invoice_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> object:
    """Re-run the full pipeline for an invoice."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)

    async with session.begin():
        await resolve_xml_invoice_processing(
            session,
            invoice_id=invoice_id,
            farm_id=farm_id,
        )

    return RedirectResponse(
        url=f"/invoice/{invoice_id}",
        status_code=303,
    )


@router.post("/invoice/{invoice_id}/correct-line")
async def correct_line(
    request: Request,
    invoice_id: uuid.UUID,
    line_item_id: str = Form(...),
    canonical_product_id: str = Form(...),
    reason: str = Form(""),
    session: AsyncSession = Depends(get_db),
) -> object:
    """Apply a line correction (manual product assignment)."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)

    async with session.begin():
        result = await apply_unresolved_line_correction(
            session,
            invoice_id=invoice_id,
            farm_id=farm_id,
            line_item_id=uuid.UUID(line_item_id),
            new_canonical_product_id=uuid.UUID(canonical_product_id),
            actor="web_ui",
            reason=reason or None,
        )

    # Build redirect URL with flash params
    redirect_url = f"/invoice/{invoice_id}?corrected=1"
    if hasattr(result, "alias_created") and result.alias_created:
        redirect_url += "&alias_created=1"

    return RedirectResponse(
        url=redirect_url,
        status_code=303,
    )
