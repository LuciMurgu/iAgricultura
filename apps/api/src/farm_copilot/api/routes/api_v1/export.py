"""/api/v1/export — SAGA XML downloads for accountants."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.api_v1_models import BulkExportRequest
from farm_copilot.worker.saga_export import (
    build_saga_export_invoice,
    generate_saga_xml,
    generate_saga_xml_batch,
)

router = APIRouter(prefix="/export")


@router.get("/saga/{invoice_id}")
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


@router.post("/saga/bulk")
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
