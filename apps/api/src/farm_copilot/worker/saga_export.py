"""SAGA XML export — generates XML files compatible with SAGA C import.

SAGA import path: Diverse > Import Date > Import date din fișiere XML

The farm (buyer) is the Client in SAGA terms.
The supplier (seller) is the Furnizor.
This ensures SAGA routes the import to "Intrări" (purchases).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from uuid import UUID

from lxml import etree
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_intake import get_invoice_shell_by_id
from farm_copilot.database.invoice_line_items import (
    get_invoice_line_items_by_invoice_id,
)


@dataclass
class SagaExportLine:
    """A single line item for SAGA export."""

    line_order: int
    description: str
    unit: str | None
    quantity: Decimal | None
    unit_price: Decimal | None  # WITHOUT TVA
    line_total: Decimal | None  # WITHOUT TVA (qty × price)
    tax_amount: Decimal | None
    supplier_product_code: str | None = None


@dataclass
class SagaExportInvoice:
    """An invoice ready for SAGA export."""

    # Supplier (Furnizor)
    supplier_name: str | None = None
    supplier_cif: str | None = None
    supplier_address: str | None = None
    supplier_reg_com: str | None = None
    supplier_bank: str | None = None
    supplier_iban: str | None = None

    # Client (the farm/buyer)
    client_name: str = ""
    client_cif: str = ""
    client_address: str | None = None
    client_reg_com: str | None = None
    client_bank: str | None = None
    client_iban: str | None = None

    # Invoice header
    invoice_number: str | None = None
    invoice_date: str | None = None  # YYYY-MM-DD
    due_date: str | None = None
    currency: str = "RON"
    reverse_charge: bool = False
    tva_la_incasare: bool = False

    # Lines
    lines: list[SagaExportLine] = field(default_factory=list)

    # Totals (computed from lines if not provided)
    total_without_tva: Decimal | None = None
    total_tva: Decimal | None = None
    total_with_tva: Decimal | None = None

    # Optional tracking
    guid: str | None = None


# ---------------------------------------------------------------------------
# XML generation
# ---------------------------------------------------------------------------


def generate_saga_xml(invoice: SagaExportInvoice) -> str:
    """Generate a SAGA-compatible XML string for a single invoice.

    Returns the XML as a UTF-8 string with XML declaration.
    """
    factura = _build_factura_element(invoice)
    return etree.tostring(
        factura,
        xml_declaration=True,
        encoding="UTF-8",
        pretty_print=True,
    ).decode("utf-8")


def generate_saga_xml_batch(
    invoices: list[SagaExportInvoice],
) -> str:
    """Generate SAGA XML containing multiple invoices.

    Each invoice is a separate <Factura> element under a root.
    Returns a single XML string.
    """
    root = etree.Element("Facturi")
    for inv in invoices:
        root.append(_build_factura_element(inv))
    return etree.tostring(
        root,
        xml_declaration=True,
        encoding="UTF-8",
        pretty_print=True,
    ).decode("utf-8")


def _build_factura_element(
    invoice: SagaExportInvoice,
) -> etree._Element:
    """Build a single <Factura> lxml Element."""
    factura = etree.Element("Factura")

    # -- Antet --
    antet = etree.SubElement(factura, "Antet")
    _add_text(antet, "FurnizorNume", invoice.supplier_name or "")
    _add_text(antet, "FurnizorCIF", invoice.supplier_cif or "")
    _add_text(
        antet, "FurnizorNrRegCom", invoice.supplier_reg_com or ""
    )
    _add_text(
        antet, "FurnizorAdresa", invoice.supplier_address or ""
    )
    _add_text(antet, "FurnizorBanca", invoice.supplier_bank or "")
    _add_text(antet, "FurnizorIBAN", invoice.supplier_iban or "")
    _add_text(antet, "ClientNume", invoice.client_name)
    _add_text(antet, "ClientCIF", invoice.client_cif)
    _add_text(
        antet, "ClientNrRegCom", invoice.client_reg_com or ""
    )
    _add_text(antet, "ClientAdresa", invoice.client_address or "")
    _add_text(antet, "ClientBanca", invoice.client_bank or "")
    _add_text(antet, "ClientIBAN", invoice.client_iban or "")
    _add_text(
        antet, "FacturaNumar", invoice.invoice_number or ""
    )
    _add_text(antet, "FacturaData", invoice.invoice_date or "")
    _add_text(antet, "FacturaScadenta", invoice.due_date or "")
    _add_text(
        antet,
        "FacturaTaxareInversa",
        "Da" if invoice.reverse_charge else "Nu",
    )
    _add_text(
        antet,
        "FacturaTVAIncasare",
        "Da" if invoice.tva_la_incasare else "Nu",
    )
    _add_text(antet, "FacturaMoneda", invoice.currency)
    if invoice.guid:
        _add_text(antet, "GUID_factura", invoice.guid)

    # -- Detalii --
    detalii = etree.SubElement(factura, "Detalii")
    continut = etree.SubElement(detalii, "Continut")

    for line in invoice.lines:
        linie = etree.SubElement(continut, "Linie")
        _add_text(linie, "LinieNrCrt", str(line.line_order))
        _add_text(linie, "Descriere", line.description)
        _add_text(
            linie,
            "CodArticolFurnizor",
            line.supplier_product_code or "",
        )
        _add_text(linie, "UM", line.unit or "")
        _add_text(linie, "Cantitate", _fmt(line.quantity))
        _add_text(linie, "Pret", _fmt(line.unit_price))
        _add_text(linie, "Valoare", _fmt(line.line_total))
        _add_text(linie, "TVA", _fmt(line.tax_amount))

    # -- Sumar --
    sumar = etree.SubElement(factura, "Sumar")
    total_val = invoice.total_without_tva or sum(
        (ln.line_total or Decimal(0)) for ln in invoice.lines
    )
    total_tva = invoice.total_tva or sum(
        (ln.tax_amount or Decimal(0)) for ln in invoice.lines
    )
    total = invoice.total_with_tva or (total_val + total_tva)

    _add_text(sumar, "TotalValoare", _fmt(total_val))
    _add_text(sumar, "TotalTVA", _fmt(total_tva))
    _add_text(sumar, "Total", _fmt(total))

    return factura


def _add_text(
    parent: etree._Element, tag: str, text: str
) -> None:
    """Add a child element with text content."""
    elem = etree.SubElement(parent, tag)
    elem.text = text


def _fmt(value: Decimal | None) -> str:
    """Format Decimal for SAGA — 2 decimal places."""
    if value is None:
        return "0.00"
    return f"{value:.2f}"


# ---------------------------------------------------------------------------
# DB-to-SAGA mapper
# ---------------------------------------------------------------------------


async def build_saga_export_invoice(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
    farm_name: str,
    farm_cif: str,
) -> SagaExportInvoice | None:
    """Load an invoice from DB and map to SagaExportInvoice.

    Returns None if invoice not found.
    """
    invoice = await get_invoice_shell_by_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )
    if invoice is None:
        return None

    line_items = await get_invoice_line_items_by_invoice_id(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    # Extract supplier info from raw_extraction_data
    ext = invoice.raw_extraction_data or {}
    supplier_cif = ext.get("supplier_tax_id") or ""
    supplier_name = ext.get("supplier_name", "")

    lines = [
        SagaExportLine(
            line_order=li.line_order,
            description=li.raw_description or "",
            unit=li.unit,
            quantity=li.quantity,
            unit_price=li.unit_price,
            line_total=li.line_total,
            tax_amount=li.tax_amount,
        )
        for li in line_items
    ]

    return SagaExportInvoice(
        supplier_name=supplier_name,
        supplier_cif=supplier_cif,
        client_name=farm_name,
        client_cif=farm_cif,
        invoice_number=invoice.invoice_number,
        invoice_date=(
            invoice.invoice_date.isoformat()
            if invoice.invoice_date
            else None
        ),
        due_date=(
            invoice.due_date.isoformat()
            if invoice.due_date
            else None
        ),
        currency=invoice.currency,
        lines=lines,
        total_without_tva=invoice.subtotal_amount,
        total_tva=invoice.tax_amount,
        total_with_tva=invoice.total_amount,
        guid=str(invoice.id),
    )
