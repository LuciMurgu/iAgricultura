"""Alert derivation shim — thin wrapper around domain function."""

from __future__ import annotations

from farm_copilot.domain.alert_derivation import (
    DeriveInvoiceAlertsInput,
    InvoiceAlertsResult,
    derive_invoice_alerts,
)
from farm_copilot.domain.duplicate_suspicion import DuplicateSuspicionResult
from farm_copilot.domain.invoice_validation import InvoiceValidationResult


def derive_alerts_from_validation(
    *,
    invoice_id: str,
    farm_id: str,
    validation_results: list[InvoiceValidationResult],
    duplicate_suspicion: DuplicateSuspicionResult,
) -> InvoiceAlertsResult:
    """Map inputs and call derive_invoice_alerts."""
    return derive_invoice_alerts(
        DeriveInvoiceAlertsInput(
            invoice_id=invoice_id,
            farm_id=farm_id,
            validation_results=validation_results,
            duplicate_suspicion=duplicate_suspicion,
        )
    )
