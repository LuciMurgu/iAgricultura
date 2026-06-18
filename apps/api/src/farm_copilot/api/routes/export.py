"""Export routes — SAGA XML download (single + bulk)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import get_current_farm_id, get_db
from farm_copilot.worker.saga_export import (
    build_saga_export_invoice,
    generate_saga_xml,
    generate_saga_xml_batch,
)

router = APIRouter(tags=["export"])


@router.get("/export/saga/{invoice_id}")
async def export_saga_single(
    request: Request,
    invoice_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Download a single invoice as SAGA-compatible XML."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        raise HTTPException(status_code=401)

    farm_name = request.session.get("farm_name", "")
    farm_cif = request.session.get("farm_cif", "")

    invoice = await build_saga_export_invoice(
        session,
        invoice_id=invoice_id,
        farm_id=farm_id,
        farm_name=farm_name,
        farm_cif=farm_cif,
    )
    if not invoice:
        raise HTTPException(status_code=404)

    xml_content = generate_saga_xml(invoice)

    inv_num = invoice.invoice_number or str(invoice_id)
    inv_date = invoice.invoice_date or "nodate"
    filename = f"saga_{inv_num}_{inv_date}.xml"

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.post("/export/saga/bulk")
async def export_saga_bulk(
    request: Request,
    session: AsyncSession = Depends(get_db),
    invoice_ids: str = Form(...),
) -> Response:
    """Download multiple invoices as a single SAGA XML file."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        raise HTTPException(status_code=401)

    farm_name = request.session.get("farm_name", "")
    farm_cif = request.session.get("farm_cif", "")

    ids = [
        UUID(i.strip())
        for i in invoice_ids.split(",")
        if i.strip()
    ]

    invoices = []
    for inv_id in ids:
        saga_inv = await build_saga_export_invoice(
            session,
            invoice_id=inv_id,
            farm_id=farm_id,
            farm_name=farm_name,
            farm_cif=farm_cif,
        )
        if saga_inv:
            invoices.append(saga_inv)

    if not invoices:
        raise HTTPException(
            status_code=404, detail="No invoices found"
        )

    xml_content = generate_saga_xml_batch(invoices)
    count = len(invoices)

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": (
                f'attachment; filename="saga_export_{count}'
                f'_invoices.xml"'
            )
        },
    )
