"""NC tariff code mapping for e-Transport declarations.

The ``codTarifar`` field requires at minimum a 4-digit NC code.
For agricultural products, these are the most common groups.

Pure domain module — no DB, no side effects.
"""

from __future__ import annotations

# Category → list of (nc_code, description) for common products
NC_CODES: dict[str, list[tuple[str, str]]] = {
    # Cereals
    "wheat": [("1001", "Grâu și meslin")],
    "corn": [("1005", "Porumb")],
    "barley": [("1003", "Orz")],
    "rapeseed": [("1205", "Semințe de rapiță")],
    "sunflower": [("1206", "Semințe de floarea soarelui")],
    "soybean": [("1201", "Boabe de soia")],
    # Fertilizers
    "fertilizer": [("3102", "Îngrășăminte minerale azotate")],
    # Pesticides
    "herbicide": [("3808", "Insecticide, fungicide, erbicide")],
    "fungicide": [("3808", "Insecticide, fungicide, erbicide")],
    "insecticide": [("3808", "Insecticide, fungicide, erbicide")],
    # Fuel
    "fuel": [("2710", "Uleiuri din petrol (motorină, benzină)")],
    # Seeds
    "seed": [("1209", "Semințe pentru însămânțare")],
}

# Default for unknown categories
DEFAULT_NC_CODE = ("9999", "Alte mărfuri")


def get_nc_code(
    category: str | None,
    product_name: str | None = None,  # noqa: ARG001
    *,
    nc_code_override: str | None = None,
) -> tuple[str, str]:
    """Get the NC tariff code for a product category.

    Returns ``(code, description)``. Checks product-level override
    first, then falls back to category-level mapping.
    """
    if nc_code_override:
        return (nc_code_override, "Custom NC code")
    if category and category.lower() in NC_CODES:
        entries = NC_CODES[category.lower()]
        return entries[0]
    return DEFAULT_NC_CODE
