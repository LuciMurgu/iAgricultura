"""Explanation derivation shim — thin wrapper around domain function."""

from __future__ import annotations

from farm_copilot.domain.alert_derivation import InvoiceAlert
from farm_copilot.domain.explanation_derivation import (
    DeriveInvoiceExplanationsInput,
    InvoiceExplanationsResult,
    derive_invoice_explanations,
)


def derive_explanations_from_alerts(
    *,
    invoice_id: str,
    farm_id: str,
    alerts: list[InvoiceAlert],
) -> InvoiceExplanationsResult:
    """Map inputs and call derive_invoice_explanations."""
    return derive_invoice_explanations(
        DeriveInvoiceExplanationsInput(
            invoice_id=invoice_id,
            farm_id=farm_id,
            alerts=alerts,
        )
    )
