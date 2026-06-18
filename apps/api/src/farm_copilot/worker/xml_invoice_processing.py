"""Pipeline orchestrator — 9-step sequential XML invoice processing.

Single entry point that sequences all worker shims for processing an
XML e-Factura invoice.  Short-circuits on extraction/classification/
normalization failures and gates stock-in on validation results.

Steps:
  1. XML Extraction         → short-circuit on failure
  2. Line Classification    → short-circuit on not_found
  3. Exact Normalization    → short-circuit on not_found
  4. Benchmark Comparison   → (internal to validation)
  5. Invoice Validation     → always continues (includes dup suspicion)
  6. Stock-In               → gated by validation blocking findings
  7. Alert Derivation       → always runs
  8. Explanation Derivation → always runs
  9. Status Resolution      → derive and persist final status
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.invoice_alerts import (
    delete_alerts_by_invoice_id,
    persist_invoice_alerts,
)
from farm_copilot.database.invoice_explanations import (
    delete_explanations_by_invoice_id,
    persist_invoice_explanations,
)
from farm_copilot.database.invoice_status import update_invoice_status
from farm_copilot.database.session import async_session
from farm_copilot.worker.alert_derivation import derive_alerts_from_validation
from farm_copilot.worker.exact_normalization import resolve_exact_normalization
from farm_copilot.worker.explanation_derivation import (
    derive_explanations_from_alerts,
)
from farm_copilot.worker.invoice_validation import resolve_invoice_validation
from farm_copilot.worker.line_classification import resolve_line_classification
from farm_copilot.worker.stock_in import resolve_stock_in
from farm_copilot.worker.xml_extraction import (
    XmlExtractionCompleted,
    resolve_xml_extraction,
)

# ---------------------------------------------------------------------------
# Per-step outcome types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ExtractionStepOutcome:
    step: str = "extraction"
    outcome: str = ""
    extracted_line_count: int | None = None
    extraction_method: str | None = None


@dataclass(frozen=True)
class ClassificationStepOutcome:
    step: str = "classification"
    outcome: str = ""
    total_lines: int = 0
    stockable_input: int = 0
    non_stockable_charge: int = 0
    service: int = 0
    discount_adjustment: int = 0
    unresolved: int = 0
    deterministic: int = 0


@dataclass(frozen=True)
class NormalizationStepOutcome:
    step: str = "normalization"
    outcome: str = ""
    total_lines: int = 0
    normalized_lines: int = 0
    ambiguous_lines: int = 0
    unmatched: int = 0


@dataclass(frozen=True)
class BenchmarkStepOutcome:
    step: str = "benchmark_comparison"
    outcome: str = "completed"
    note: str = (
        "Benchmark comparison ran internally as part of invoice validation"
    )


@dataclass(frozen=True)
class ValidationStepOutcome:
    step: str = "validation"
    outcome: str = ""
    total_rules: int = 0
    pass_count: int = 0
    warn: int = 0
    fail: int = 0
    not_evaluable: int = 0
    has_blocking_findings: bool = False


@dataclass(frozen=True)
class StockInStepOutcome:
    step: str = "stock_in"
    outcome: str = ""
    created: int = 0
    already_present: int = 0
    skipped: int = 0
    total: int = 0
    blocked_by_validation: bool = False


@dataclass(frozen=True)
class AlertStepOutcome:
    step: str = "alert_derivation"
    outcome: str = "completed"
    total: int = 0
    by_severity: dict[str, int] = field(
        default_factory=lambda: {"warning": 0, "critical": 0}
    )


@dataclass(frozen=True)
class ExplanationStepOutcome:
    step: str = "explanation_derivation"
    outcome: str = "completed"
    total: int = 0
    by_kind: dict[str, int] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Aggregate types
# ---------------------------------------------------------------------------


@dataclass
class PipelineSteps:
    extraction: ExtractionStepOutcome | None = None
    classification: ClassificationStepOutcome | None = None
    normalization: NormalizationStepOutcome | None = None
    benchmark_comparison: BenchmarkStepOutcome | None = None
    validation: ValidationStepOutcome | None = None
    stock_in: StockInStepOutcome | None = None
    alert_derivation: AlertStepOutcome | None = None
    explanation_derivation: ExplanationStepOutcome | None = None


@dataclass(frozen=True)
class XmlInvoiceProcessingResult:
    invoice_id: str
    farm_id: str
    source_type: str | None
    overall_outcome: str
    final_invoice_status: str | None
    steps: PipelineSteps
    validation_payload: object | None = None
    alerts_payload: object | None = None
    explanations_payload: object | None = None


# ---------------------------------------------------------------------------
# Main pipeline orchestrator
# ---------------------------------------------------------------------------


async def resolve_xml_invoice_processing(
    session: AsyncSession,
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> XmlInvoiceProcessingResult:
    """Run the full 9-step XML invoice processing pipeline."""
    steps = PipelineSteps()
    inv_id_str = str(invoice_id)
    farm_id_str = str(farm_id)

    # ── Step 1: XML Extraction ──────────────────────────────────────
    extraction_result = await resolve_xml_extraction(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    if not isinstance(extraction_result, XmlExtractionCompleted):
        steps.extraction = ExtractionStepOutcome(
            outcome=extraction_result.kind,
        )
        return XmlInvoiceProcessingResult(
            invoice_id=inv_id_str,
            farm_id=farm_id_str,
            source_type="xml",
            overall_outcome=extraction_result.kind,
            final_invoice_status=None,
            steps=steps,
        )

    steps.extraction = ExtractionStepOutcome(
        outcome="completed",
        extracted_line_count=extraction_result.extracted_line_count,
        extraction_method=extraction_result.extraction_method,
    )

    # ── Step 2: Line Classification ─────────────────────────────────
    classification_result = await resolve_line_classification(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    if not classification_result.completed:
        steps.classification = ClassificationStepOutcome(
            outcome="invoice_not_found",
        )
        return XmlInvoiceProcessingResult(
            invoice_id=inv_id_str,
            farm_id=farm_id_str,
            source_type="xml",
            overall_outcome="processing_failed",
            final_invoice_status=None,
            steps=steps,
        )

    cr = classification_result.classification_result
    if cr is not None:
        steps.classification = ClassificationStepOutcome(
            outcome="completed",
            total_lines=cr.counts.total,
            stockable_input=cr.counts.stockable_input,
            non_stockable_charge=cr.counts.non_stockable_charge,
            service=cr.counts.service,
            discount_adjustment=cr.counts.discount_adjustment,
            unresolved=cr.counts.unresolved,
            deterministic=cr.deterministic,
        )
    else:
        steps.classification = ClassificationStepOutcome(
            outcome="skipped",
        )

    # ── Step 3: Exact Normalization ─────────────────────────────────
    norm_result = await resolve_exact_normalization(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    if not norm_result.completed:
        steps.normalization = NormalizationStepOutcome(
            outcome="invoice_not_found",
        )
        return XmlInvoiceProcessingResult(
            invoice_id=inv_id_str,
            farm_id=farm_id_str,
            source_type="xml",
            overall_outcome="processing_failed",
            final_invoice_status=None,
            steps=steps,
        )

    steps.normalization = NormalizationStepOutcome(
        outcome="completed",
        total_lines=len(norm_result.line_outcomes),
        normalized_lines=norm_result.winner_count,
        ambiguous_lines=norm_result.ambiguous_count,
        unmatched=norm_result.none_count,
    )

    # ── Step 4+5: Validation (includes benchmark + dup suspicion) ──
    validation_result = await resolve_invoice_validation(
        session, invoice_id=invoice_id, farm_id=farm_id
    )

    if not validation_result.completed:
        steps.benchmark_comparison = BenchmarkStepOutcome(outcome="skipped")
        steps.validation = ValidationStepOutcome(
            outcome="invoice_not_found",
        )
        return XmlInvoiceProcessingResult(
            invoice_id=inv_id_str,
            farm_id=farm_id_str,
            source_type="xml",
            overall_outcome="processing_failed",
            final_invoice_status=None,
            steps=steps,
        )

    steps.benchmark_comparison = BenchmarkStepOutcome(outcome="completed")

    vs = validation_result.validation_summary
    if vs is not None:
        steps.validation = ValidationStepOutcome(
            outcome="completed",
            total_rules=vs.total_rules,
            pass_count=vs.pass_count,
            warn=vs.warn,
            fail=vs.fail,
            not_evaluable=vs.not_evaluable,
            has_blocking_findings=validation_result.has_blocking_findings,
        )
    else:
        steps.validation = ValidationStepOutcome(outcome="completed")

    # ── Step 6: Stock-In ────────────────────────────────────────────
    stock_result = await resolve_stock_in(
        session,
        invoice_id=invoice_id,
        farm_id=farm_id,
        has_blocking_findings=validation_result.has_blocking_findings,
    )

    if stock_result.completed and stock_result.derivation is not None:
        steps.stock_in = StockInStepOutcome(
            outcome="completed",
            created=stock_result.created_count,
            already_present=stock_result.already_present_count,
            skipped=stock_result.skipped_count,
            total=stock_result.derivation.counts.total,
            blocked_by_validation=(
                stock_result.derivation.blocked_by_validation
            ),
        )
    else:
        steps.stock_in = StockInStepOutcome(
            outcome="skipped",
            blocked_by_validation=validation_result.has_blocking_findings,
        )

    # ── Step 7: Alert Derivation ────────────────────────────────────
    alerts_result = None
    if validation_result.duplicate_suspicion is not None:
        alerts_result = derive_alerts_from_validation(
            invoice_id=inv_id_str,
            farm_id=farm_id_str,
            validation_results=validation_result.validation_results,
            duplicate_suspicion=validation_result.duplicate_suspicion,
        )
        steps.alert_derivation = AlertStepOutcome(
            outcome="completed",
            total=alerts_result.counts.total,
            by_severity={
                "warning": alerts_result.counts.by_severity.warning,
                "critical": alerts_result.counts.by_severity.critical,
            },
        )
    else:
        steps.alert_derivation = AlertStepOutcome(outcome="completed")

    # ── Step 8: Explanation Derivation ──────────────────────────────
    explanations_result = None
    if alerts_result is not None:
        explanations_result = derive_explanations_from_alerts(
            invoice_id=inv_id_str,
            farm_id=farm_id_str,
            alerts=alerts_result.alerts,
        )
        by_kind: dict[str, int] = {
            "suspicious_overpayment": (
                explanations_result.counts.by_kind.suspicious_overpayment
            ),
            "confirmed_duplicate_invoice": (
                explanations_result.counts.by_kind.confirmed_duplicate_invoice
            ),
            "possible_duplicate_invoice": (
                explanations_result.counts.by_kind.possible_duplicate_invoice
            ),
            "invoice_total_mismatch": (
                explanations_result.counts.by_kind.invoice_total_mismatch
            ),
        }
        steps.explanation_derivation = ExplanationStepOutcome(
            outcome="completed",
            total=explanations_result.counts.total,
            by_kind=by_kind,
        )
    else:
        steps.explanation_derivation = ExplanationStepOutcome(
            outcome="completed",
        )

    # ── Step 8.5: Persist alerts + explanations ─────────────────────
    if alerts_result and alerts_result.alerts:
        alert_records = await persist_invoice_alerts(
            session,
            farm_id=farm_id,
            invoice_id=invoice_id,
            alerts=alerts_result.alerts,
        )
        alert_id_map = {
            f"{r.alert_key}:{r.subject_id}": r.id
            for r in alert_records
        }
        if explanations_result and explanations_result.explanations:
            await persist_invoice_explanations(
                session,
                farm_id=farm_id,
                invoice_id=invoice_id,
                explanations=explanations_result.explanations,
                alert_id_map=alert_id_map,
            )
    else:
        # No alerts — clean up stale persisted data from prior runs
        await delete_explanations_by_invoice_id(
            session, invoice_id=invoice_id, farm_id=farm_id
        )
        await delete_alerts_by_invoice_id(
            session, invoice_id=invoice_id, farm_id=farm_id
        )

    # ── Step 9: Status Resolution ───────────────────────────────────
    if validation_result.has_blocking_findings or (vs is not None and (vs.warn > 0 or vs.fail > 0)):
        final_status = "needs_review"
    else:
        final_status = "completed"

    await update_invoice_status(
        session,
        invoice_id=invoice_id,
        farm_id=farm_id,
        status=final_status,
    )

    return XmlInvoiceProcessingResult(
        invoice_id=inv_id_str,
        farm_id=farm_id_str,
        source_type="xml",
        overall_outcome="completed",
        final_invoice_status=final_status,
        steps=steps,
        validation_payload=validation_result,
        alerts_payload=alerts_result,
        explanations_payload=explanations_result,
    )


# ---------------------------------------------------------------------------
# Convenience wrapper — creates its own session
# ---------------------------------------------------------------------------


async def run_xml_invoice_processing(
    *,
    invoice_id: UUID,
    farm_id: UUID,
) -> XmlInvoiceProcessingResult:
    """Standalone runner — creates its own session, runs pipeline, commits."""
    async with async_session() as session, session.begin():
        return await resolve_xml_invoice_processing(
            session,
            invoice_id=invoice_id,
            farm_id=farm_id,
        )
