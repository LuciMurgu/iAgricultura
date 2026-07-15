"""/api/v1/procurement — safe review summary derived from pipeline data."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.api.deps import ApiUser, get_current_user_api, get_db
from farm_copilot.contracts.procurement_review_models import (
    ProcurementReviewEvidenceItem,
    ProcurementReviewIssueResponse,
    ProcurementReviewResponse,
    ProcurementReviewSuggestedAction,
    ProcurementReviewSummaryResponse,
    ProcurementReviewUnsafeAction,
)
from farm_copilot.database.procurement_review import (
    get_procurement_review_data,
)
from farm_copilot.domain.procurement_review import (
    ProcurementReviewInput,
    ReviewAlert,
    ReviewInvoiceLine,
    derive_procurement_review,
)

router = APIRouter(prefix="/procurement")


@router.get("/review", response_model=ProcurementReviewResponse)
async def api_procurement_review(
    api_user: ApiUser = Depends(get_current_user_api),
    session: AsyncSession = Depends(get_db),
) -> ProcurementReviewResponse:
    """Procurement review summary from real invoice/alert/stock data.

    Transforms existing invoice pipeline data into a safe review summary.
    Farm-scoped via session auth — never exposes another farm's data.
    """
    now = datetime.now(tz=UTC)

    # Fetch farm-scoped data
    review_data = await get_procurement_review_data(
        session,
        farm_id=api_user.farm_id,
        farm_name=api_user.farm_name,
    )

    # Transform DB rows to domain input
    domain_lines = [
        ReviewInvoiceLine(
            line_item_id=ln.line_item_id,
            invoice_id=ln.invoice_id,
            invoice_number=ln.invoice_number,
            invoice_date=ln.invoice_date,
            supplier_name=ln.supplier_name,
            line_order=ln.line_order,
            raw_description=ln.raw_description,
            quantity=ln.quantity,
            unit=ln.unit,
            unit_price=ln.unit_price,
            line_total=ln.line_total,
            currency=ln.currency,
            line_classification=ln.line_classification,
            canonical_product_id=ln.canonical_product_id,
            canonical_product_name=ln.canonical_product_name,
            normalization_confidence=ln.normalization_confidence,
            normalization_method=ln.normalization_method,
            has_stock_movement=ln.has_stock_movement,
        )
        for ln in review_data.lines
    ]

    domain_alerts = [
        ReviewAlert(
            alert_id=a.alert_id,
            invoice_id=a.invoice_id,
            invoice_number=a.invoice_number,
            alert_key=a.alert_key,
            severity=a.severity,
            subject_type=a.subject_type,
            subject_id=a.subject_id,
            reason_codes=a.reason_codes,
            evidence=a.evidence,
            confidence=a.confidence,
            recommended_action=a.recommended_action,
        )
        for a in review_data.alerts
    ]

    domain_input = ProcurementReviewInput(
        farm_id=str(api_user.farm_id),
        farm_name=api_user.farm_name,
        lines=domain_lines,
        alerts=domain_alerts,
        total_invoices=review_data.total_invoices,
    )

    # Run pure domain logic
    result = derive_procurement_review(
        domain_input,
        generated_at=now.isoformat(),
    )

    # Serialize to response
    return ProcurementReviewResponse(
        farm_id=result.farm_id,
        farm_name=result.farm_name,
        generated_at=result.generated_at,
        source=result.source,
        summary=ProcurementReviewSummaryResponse(
            total_invoices_reviewed=result.summary.total_invoices_reviewed,
            issues_needing_review=result.summary.issues_needing_review,
            high_attention_issues=result.summary.high_attention_issues,
            product_match_uncertainty_count=result.summary.product_match_uncertainty_count,
            stock_evidence_count=result.summary.stock_evidence_count,
            possible_margin_attention_ron=result.summary.possible_margin_attention_ron,
        ),
        issues=[
            ProcurementReviewIssueResponse(
                id=issue.id,
                type=issue.type,
                severity=issue.severity,
                status=issue.status,
                title=issue.title,
                what_happened=issue.what_happened,
                why_it_matters=issue.why_it_matters,
                supplier_name=issue.supplier_name,
                product_name=issue.product_name,
                normalized_product_name=issue.normalized_product_name,
                invoice_id=issue.invoice_id,
                invoice_number=issue.invoice_number,
                invoice_date=issue.invoice_date,
                quantity=issue.quantity,
                unit=issue.unit,
                unit_price=issue.unit_price,
                currency=issue.currency,
                product_match_confidence=issue.product_match_confidence,
                evidence=[
                    ProcurementReviewEvidenceItem(
                        id=ev.id,
                        type=ev.type,
                        title=ev.title,
                        source=ev.source,
                        summary=ev.summary,
                        confidence=ev.confidence,
                        date=ev.date,
                    )
                    for ev in issue.evidence
                ],
                suggested_actions=[
                    ProcurementReviewSuggestedAction(
                        label=sa.label,
                        action_type=sa.action_type,
                        href=sa.href,
                        disabled_reason=sa.disabled_reason,
                    )
                    for sa in issue.suggested_actions
                ],
                unsafe_actions=[
                    ProcurementReviewUnsafeAction(
                        label=ua.label,
                        reason=ua.reason,
                    )
                    for ua in issue.unsafe_actions
                ],
                reviewer_roles=list(issue.reviewer_roles),
                disclaimer=issue.disclaimer,
            )
            for issue in result.issues
        ],
        disclaimer=result.disclaimer,
    )
