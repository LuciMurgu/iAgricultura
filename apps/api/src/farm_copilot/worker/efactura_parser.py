"""e-Factura XML parser — lxml-based, UBL 2.1 namespace-aware.

Parses Romanian e-Factura XML invoices and returns structured extraction
results. Handles UBL 2.1 namespaces natively via XPath namespace maps.

This module lives in the worker layer (not domain) because it performs
I/O-adjacent work (XML parsing) and is used by the worker pipeline.

Decision: DEC-0008 — lxml replaces fast-xml-parser. Advantages: native
XPath, namespace support, future schematron validation for CIUS-RO.
"""

from __future__ import annotations

from dataclasses import dataclass

from lxml import etree

# ---------------------------------------------------------------------------
# UBL 2.1 namespace map
# ---------------------------------------------------------------------------

_NS = {
    "inv": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
}

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class EFacturaLineItem:
    line_order: int
    raw_description: str | None
    quantity: str | None
    unit: str | None
    unit_price: str | None
    line_total: str | None
    tax_rate: str | None
    tax_amount: str | None


@dataclass(frozen=True)
class EFacturaExtractionResult:
    kind: str  # "parsed"
    invoice_number: str | None
    invoice_date: str | None
    due_date: str | None
    currency: str | None
    subtotal_amount: str | None
    tax_amount: str | None
    total_amount: str | None
    supplier_name: str | None
    supplier_tax_id: str | None
    line_items: list[EFacturaLineItem]
    raw_xml: str


@dataclass(frozen=True)
class EFacturaParseError:
    kind: str  # "malformed_xml" | "unsupported_format"
    message: str


EFacturaParseResult = EFacturaExtractionResult | EFacturaParseError

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _xpath_text(el: etree._Element, path: str) -> str | None:
    """Extract text from first XPath match, or None."""
    nodes = el.xpath(path, namespaces=_NS)
    if not nodes:
        return None
    node = nodes[0]
    # Could be an Element or a string (from text())
    if isinstance(node, str):
        val = node.strip()
        return val or None
    text = node.text
    if text is None:
        return None
    val = text.strip()
    return val or None


def _xpath_num(el: etree._Element, path: str) -> str | None:
    """Extract numeric text — returns None if not a valid number."""
    t = _xpath_text(el, path)
    if t is None:
        return None
    try:
        float(t)
    except ValueError:
        return None
    return t


def _xpath_attr(el: etree._Element, path: str, attr: str) -> str | None:
    """Extract an attribute from the first XPath match."""
    nodes = el.xpath(path, namespaces=_NS)
    if not nodes:
        return None
    return nodes[0].get(attr)


def _strip_ns(tag: str) -> str:
    """Strip namespace from tag: '{ns}local' -> 'local'."""
    if tag.startswith("{"):
        return tag.split("}", 1)[1]
    return tag


# ---------------------------------------------------------------------------
# parseEFacturaXml — main entry point
# ---------------------------------------------------------------------------


def parse_efactura_xml(xml_content: str) -> EFacturaParseResult:
    """Parse an e-Factura UBL 2.1 XML string.

    Returns:
        ``EFacturaExtractionResult`` on success, ``EFacturaParseError``
        on malformed XML or unsupported format.
    """
    # Empty / whitespace check
    if not xml_content or not xml_content.strip():
        return EFacturaParseError(
            kind="malformed_xml",
            message="Empty XML content",
        )

    # Parse XML
    try:
        root = etree.fromstring(xml_content.encode("utf-8"))  # noqa: S320
    except etree.XMLSyntaxError as exc:
        return EFacturaParseError(
            kind="malformed_xml",
            message=f"XML parse error: {exc}",
        )

    # Check root is <Invoice> (with or without namespace)
    local_name = _strip_ns(root.tag)
    if local_name != "Invoice":
        return EFacturaParseError(
            kind="unsupported_format",
            message="No <Invoice> root element found. Only UBL 2.1 Invoice XML is supported.",
        )

    # Detect whether the document uses namespaces
    uses_ns = root.tag.startswith("{")

    # Build XPath prefixes
    if uses_ns:
        cbc = "cbc:"
        cac = "cac:"
    else:
        cbc = ""
        cac = ""

    # --- Header ---
    invoice_number = _xpath_text(root, f"{cbc}ID")
    invoice_date = _xpath_text(root, f"{cbc}IssueDate")
    due_date = _xpath_text(root, f"{cbc}DueDate")
    currency = _xpath_text(root, f"{cbc}DocumentCurrencyCode")

    # --- Monetary totals ---
    subtotal_amount = _xpath_num(
        root, f"{cac}LegalMonetaryTotal/{cbc}TaxExclusiveAmount"
    )
    total_amount = _xpath_num(
        root, f"{cac}LegalMonetaryTotal/{cbc}TaxInclusiveAmount"
    )

    # Tax: prefer TaxTotal/TaxAmount, fall back to total - subtotal
    tax_amount = _xpath_num(root, f"{cac}TaxTotal/{cbc}TaxAmount")
    if (
        tax_amount is None
        and subtotal_amount is not None
        and total_amount is not None
    ):
        diff = float(total_amount) - float(subtotal_amount)
        if diff >= 0:
            tax_amount = f"{diff:.2f}"

    # --- Supplier ---
    supplier_path = f"{cac}AccountingSupplierParty/{cac}Party"

    supplier_name = _xpath_text(
        root, f"{supplier_path}/{cac}PartyName/{cbc}Name"
    )
    # Fallback: PartyLegalEntity > RegistrationName
    if supplier_name is None:
        supplier_name = _xpath_text(
            root, f"{supplier_path}/{cac}PartyLegalEntity/{cbc}RegistrationName"
        )

    supplier_tax_id = _xpath_text(
        root, f"{supplier_path}/{cac}PartyTaxScheme/{cbc}CompanyID"
    )

    # --- Line items ---
    if uses_ns:
        line_els = root.xpath(f"{cac}InvoiceLine", namespaces=_NS)
    else:
        line_els = root.findall("InvoiceLine")

    line_items: list[EFacturaLineItem] = []
    for idx, line_el in enumerate(line_els):
        raw_description = _xpath_text(line_el, f"{cac}Item/{cbc}Name")
        if raw_description is None:
            raw_description = _xpath_text(line_el, f"{cac}Item/{cbc}Description")

        quantity = _xpath_num(line_el, f"{cbc}InvoicedQuantity")
        unit = _xpath_attr(line_el, f"{cbc}InvoicedQuantity", "unitCode")
        unit_price = _xpath_num(line_el, f"{cac}Price/{cbc}PriceAmount")
        line_total = _xpath_num(line_el, f"{cbc}LineExtensionAmount")
        tax_rate = _xpath_num(
            line_el, f"{cac}Item/{cac}ClassifiedTaxCategory/{cbc}Percent"
        )
        line_tax_amount = _xpath_num(line_el, f"{cac}TaxTotal/{cbc}TaxAmount")

        line_items.append(
            EFacturaLineItem(
                line_order=idx + 1,
                raw_description=raw_description,
                quantity=quantity,
                unit=unit,
                unit_price=unit_price,
                line_total=line_total,
                tax_rate=tax_rate,
                tax_amount=line_tax_amount,
            )
        )

    return EFacturaExtractionResult(
        kind="parsed",
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        due_date=due_date,
        currency=currency,
        subtotal_amount=subtotal_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        supplier_name=supplier_name,
        supplier_tax_id=supplier_tax_id,
        line_items=line_items,
        raw_xml=xml_content,
    )
