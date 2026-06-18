"""XML extraction shim — parse e-Factura XML and persist results."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_extraction import update_invoice_extraction
from farm_copilot.database.invoice_intake import (
    get_invoice_shell_by_id,
    get_uploaded_document_by_id,
)
from farm_copilot.database.invoice_line_items import (
    replace_invoice_extracted_line_items,
)
from farm_copilot.database.invoice_status import update_invoice_status
from farm_copilot.worker.efactura_parser import (
    EFacturaExtractionResult,
    parse_efactura_xml,
)

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class XmlExtractionCompleted:
    kind: Literal["completed"] = "completed"
    extraction_method: str = "efactura_lxml"
    header_facts_persisted: dict[str, object] | None = None
    extracted_line_count: int = 0


@dataclass(frozen=True)
class XmlExtractionNotFound:
    kind: Literal["not_found"] = "not_found"
    reason: str = ""


@dataclass(frozen=True)
class XmlExtractionUnsupportedSource:
    kind: Literal["unsupported_source"] = "unsupported_source"
    reason: str = ""


@dataclass(frozen=True)
class XmlExtractionFailed:
    kind: Literal["extraction_failed"] = "extraction_failed"
    reason: str = ""


XmlExtractionResult = (
    XmlExtractionCompleted
    | XmlExtractionNotFound
    | XmlExtractionUnsupportedSource
    | XmlExtractionFailed
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_date(val: str | None) -> date | None:
    if val is None:
        return None
    try:
        return date.fromisoformat(val)
    except ValueError:
        return None


def _parse_decimal(val: str | None) -> Decimal | None:
    if val is None:
        return None
    try:
        return Decimal(val)
    except Exception:  # noqa: BLE001
        return None


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


async def resolve_xml_extraction(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> XmlExtractionResult:
    """Read invoice XML, parse it, and persist extraction results."""
    # 1. Fetch invoice
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return XmlExtractionNotFound(
            reason=f"Invoice {invoice_id} not found for farm {farm_id}"
        )

    # 2. Fetch uploaded document
    doc = await get_uploaded_document_by_id(
        session,
        document_id=invoice.uploaded_document_id,
        farm_id=farm_id,
    )
    if doc is None:
        return XmlExtractionNotFound(
            reason=f"Uploaded document {invoice.uploaded_document_id} not found"
        )

    # 3. source_type check
    source_type = (
        doc.source_type
        if isinstance(doc.source_type, str)
        else doc.source_type.value
    )
    if source_type != "xml":
        return XmlExtractionUnsupportedSource(
            reason=f"Source type is '{source_type}', not 'xml'"
        )

    # 4. Read XML file
    try:
        xml_content = Path(doc.storage_path).read_text(encoding="utf-8")
    except (FileNotFoundError, OSError) as exc:
        return XmlExtractionFailed(reason=f"Cannot read XML file: {exc}")

    # 5. Parse
    parse_result = parse_efactura_xml(xml_content)
    if not isinstance(parse_result, EFacturaExtractionResult):
        return XmlExtractionFailed(
            reason=f"{parse_result.kind}: {parse_result.message}"
        )

    r = parse_result

    # 6. Persist: update invoice header
    await update_invoice_extraction(
        session,
        invoice_id=invoice_id,
        farm_id=farm_id,
        supplier_name=r.supplier_name,
        supplier_tax_id=r.supplier_tax_id,
        invoice_number=r.invoice_number,
        invoice_date=_parse_date(r.invoice_date),
        due_date=_parse_date(r.due_date),
        currency=r.currency,
        subtotal_amount=_parse_decimal(r.subtotal_amount),
        tax_amount=_parse_decimal(r.tax_amount),
        total_amount=_parse_decimal(r.total_amount),
        raw_extraction_data=None,
        extraction_method="efactura_lxml",
    )

    # 7. Persist: replace line items
    line_dicts = [
        {
            "line_order": li.line_order,
            "raw_description": li.raw_description,
            "quantity": _parse_decimal(li.quantity),
            "unit": li.unit,
            "unit_price": _parse_decimal(li.unit_price),
            "line_total": _parse_decimal(li.line_total),
            "tax_rate": _parse_decimal(li.tax_rate),
            "tax_amount": _parse_decimal(li.tax_amount),
        }
        for li in r.line_items
    ]
    await replace_invoice_extracted_line_items(
        session, invoice_id=invoice_id, line_items=line_dicts
    )

    # 8. Update status
    await update_invoice_status(
        session,
        invoice_id=invoice_id,
        farm_id=farm_id,
        status="processing",
    )

    header_facts: dict[str, object] = {
        "invoice_number": r.invoice_number,
        "invoice_date": r.invoice_date,
        "due_date": r.due_date,
        "currency": r.currency,
        "subtotal_amount": r.subtotal_amount,
        "tax_amount": r.tax_amount,
        "total_amount": r.total_amount,
        "supplier_name": r.supplier_name,
        "supplier_tax_id": r.supplier_tax_id,
    }

    return XmlExtractionCompleted(
        extraction_method="efactura_lxml",
        header_facts_persisted=header_facts,
        extracted_line_count=len(r.line_items),
    )
