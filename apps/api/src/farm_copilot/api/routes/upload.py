"""Upload routes — GET /upload (form) + POST /upload."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Request, UploadFile
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import get_current_farm_id, get_db
from farm_copilot.api.templates import templates
from farm_copilot.database.invoice_intake import (
    insert_invoice_shell,
    insert_uploaded_document,
)
from farm_copilot.worker.xml_invoice_processing import (
    resolve_xml_invoice_processing,
)

router = APIRouter()

# Upload storage directory
_UPLOAD_DIR = Path("uploads")


@router.get("/")
async def root(request: Request) -> RedirectResponse:
    """Redirect / to dashboard (logged in) or login (not logged in)."""
    from farm_copilot.api.deps import get_current_user_id

    if get_current_user_id(request) is not None:
        return RedirectResponse(url="/dashboard", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@router.get("/upload")
async def upload_page(request: Request) -> object:
    """Render the upload form."""
    return templates.TemplateResponse(
        request=request,
        name="upload.html",
    )


@router.post("/upload")
async def upload_invoice(
    request: Request,
    file: UploadFile,
    session: AsyncSession = Depends(get_db),
) -> object:
    """Handle XML file upload → intake → pipeline → redirect to detail."""
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        return RedirectResponse(url="/login", status_code=302)

    # 1. Validate file
    if not file.filename or not file.filename.lower().endswith(".xml"):
        return templates.TemplateResponse(
            request=request,
            name="upload.html",
            context={"error": "Only XML files are supported."},
            status_code=400,
        )

    # 2. Save file to disk
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4()
    storage_path = _UPLOAD_DIR / f"{file_id}.xml"

    with storage_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = storage_path.stat().st_size

    # 3. Insert uploaded document
    doc = await insert_uploaded_document(
        session,
        farm_id=farm_id,
        source_type="xml",
        original_filename=file.filename,
        storage_path=str(storage_path),
        file_size_bytes=file_size,
        mime_type=file.content_type,
    )

    # 4. Insert invoice shell
    invoice = await insert_invoice_shell(
        session,
        farm_id=farm_id,
        uploaded_document_id=doc.id,
    )

    await session.commit()

    # 5. Run pipeline (also persists alerts+explanations to DB)
    async with session.begin():
        await resolve_xml_invoice_processing(
            session,
            invoice_id=invoice.id,
            farm_id=farm_id,
        )

    # 6. Redirect to invoice detail
    return RedirectResponse(
        url=f"/invoice/{invoice.id}",
        status_code=303,
    )
