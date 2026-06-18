"""Generate e-Transport v2 XML declarations using lxml.

Follows the ANAF XML schema for e-Transport v2 declarations.
Reference: https://etransport.mfinante.gov.ro/informatii-tehnice
"""

from __future__ import annotations

from decimal import Decimal

from lxml import etree

from farm_copilot.database.models import (
    TransportDeclaration,
    TransportDeclarationItem,
)

ETRANSPORT_NAMESPACE = "mfp:anaf:dgti:eTransport:declaratie:v2"
NSMAP: dict[str | None, str] = {None: ETRANSPORT_NAMESPACE}


def generate_notification_xml(
    declaration: TransportDeclaration,
    items: list[TransportDeclarationItem],
) -> str:
    """Generate e-Transport v2 notification XML from DB models.

    Returns XML string ready for upload to ANAF.
    """
    root = etree.Element(
        "eTransport",
        nsmap=NSMAP,
        codDeclarant=declaration.sender_cif,
        refDeclarant=declaration.reference,
    )

    notificare = etree.SubElement(root, "notificare")

    # Operation type and scope
    _add_text(notificare, "tipOperatiune", str(declaration.operation_type))
    _add_text(notificare, "scopOperatiune", str(declaration.operation_scope))
    _add_text(
        notificare, "dataPlecare", declaration.departure_date.isoformat()
    )

    # Commercial partner (receiver for domestic sales)
    partner = etree.SubElement(notificare, "partenerComercial")
    _add_text(partner, "codTara", declaration.receiver_country)
    _add_text(partner, "codPartener", declaration.receiver_cif)
    _add_text(partner, "denumire", declaration.receiver_name)

    # Loading location
    loc_inc = etree.SubElement(notificare, "locIncarcare")
    _add_text(loc_inc, "codTara", declaration.load_country)
    if declaration.load_county:
        _add_text(loc_inc, "codJudet", declaration.load_county)
    _add_text(loc_inc, "localitate", declaration.load_city)
    if declaration.load_street:
        _add_text(loc_inc, "strada", declaration.load_street)
    if declaration.load_postal_code:
        _add_text(loc_inc, "codPostal", declaration.load_postal_code)

    # Unloading location
    loc_desc = etree.SubElement(notificare, "locDescarcare")
    _add_text(loc_desc, "codTara", declaration.unload_country)
    if declaration.unload_county:
        _add_text(loc_desc, "codJudet", declaration.unload_county)
    _add_text(loc_desc, "localitate", declaration.unload_city)
    if declaration.unload_street:
        _add_text(loc_desc, "strada", declaration.unload_street)
    if declaration.unload_postal_code:
        _add_text(loc_desc, "codPostal", declaration.unload_postal_code)

    # Goods (line items)
    for item in sorted(items, key=lambda i: i.line_order):
        bunuri = etree.SubElement(notificare, "bunuri")
        _add_text(bunuri, "codTarifar", item.nc_tariff_code)
        _add_text(bunuri, "denumireMarfa", item.product_description)
        _add_text(bunuri, "cantitate", _format_decimal(item.quantity))
        _add_text(bunuri, "unitMas", item.unit)
        _add_text(
            bunuri, "greutateNeta", _format_decimal(item.net_weight_kg)
        )
        _add_text(
            bunuri, "greutateBruta", _format_decimal(item.gross_weight_kg)
        )
        _add_text(bunuri, "scopOperatiune", str(item.operation_scope))
        _add_text(bunuri, "valoare", _format_decimal(item.value_ron))

    # Transport details (vehicle + carrier)
    if declaration.vehicle_plate:
        date_transport = etree.SubElement(notificare, "dateTransport")
        _add_text(date_transport, "nrVehicul", declaration.vehicle_plate)
        if declaration.carrier_cif:
            _add_text(
                date_transport,
                "codTaraOrgTransport",
                declaration.carrier_country,
            )
            _add_text(
                date_transport,
                "codOrgTransport",
                declaration.carrier_cif,
            )
        if declaration.carrier_name:
            _add_text(
                date_transport,
                "denumireOrgTransport",
                declaration.carrier_name,
            )

    xml_string: str = etree.tostring(
        root,
        pretty_print=True,
        xml_declaration=True,
        encoding="UTF-8",
    ).decode("utf-8")

    return xml_string


def generate_deletion_xml(
    declarant_cif: str,
    uit_code: str,
    reference: str,
) -> str:
    """Generate XML for deleting (canceling) an existing declaration."""
    root = etree.Element(
        "eTransport",
        nsmap=NSMAP,
        codDeclarant=declarant_cif,
        refDeclarant=reference,
    )

    stergere = etree.SubElement(root, "stergere")
    _add_text(stergere, "uit", uit_code)

    return etree.tostring(
        root,
        pretty_print=True,
        xml_declaration=True,
        encoding="UTF-8",
    ).decode("utf-8")


def generate_confirmation_xml(
    declarant_cif: str,
    uit_code: str,
    reference: str,
    confirmation_type: str = "10",
    observations: str | None = None,
) -> str:
    """Generate XML for confirming receipt of goods."""
    root = etree.Element(
        "eTransport",
        nsmap=NSMAP,
        codDeclarant=declarant_cif,
        refDeclarant=reference,
    )

    confirmare = etree.SubElement(root, "confirmare")
    _add_text(confirmare, "uit", uit_code)
    _add_text(confirmare, "tipConfirmare", confirmation_type)
    if observations:
        _add_text(confirmare, "observatii", observations)

    return etree.tostring(
        root,
        pretty_print=True,
        xml_declaration=True,
        encoding="UTF-8",
    ).decode("utf-8")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _add_text(
    parent: etree._Element, tag: str, text: str
) -> etree._Element:
    """Add a child element with text content."""
    el = etree.SubElement(parent, tag)
    el.text = text
    return el


def _format_decimal(value: Decimal) -> str:
    """Format decimal for XML — 2 decimal places, no scientific notation."""
    return f"{value:.2f}"
