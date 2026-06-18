"""Integration tests for full XML invoice processing pipeline.

Verifies end-to-end pipeline execution and error handling
against a live PostgreSQL database.
"""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.worker.xml_invoice_processing import (
    XmlInvoiceProcessingResult,
    resolve_xml_invoice_processing,
)
from tests.conftest import requires_db
from tests.helpers import seed_farm, seed_invoice, seed_uploaded_document

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures"
SAMPLE_XML_PATH = FIXTURE_DIR / "efactura_sample.xml"


@requires_db
@pytest.mark.integration
class TestPipelineIntegration:
    """Full pipeline integration tests — E2E + error paths."""

    async def test_full_pipeline_e2e_with_xml(
        self, db_session: AsyncSession
    ) -> None:
        """Full pipeline: XML → extraction → classification → ...→ status."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(
            db_session,
            farm.id,
            source_type="xml",
            storage_path=str(SAMPLE_XML_PATH),
        )
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="uploaded"
        )

        result: XmlInvoiceProcessingResult = (
            await resolve_xml_invoice_processing(
                db_session,
                invoice_id=invoice.id,
                farm_id=farm.id,
            )
        )

        # Overall
        assert result.overall_outcome == "completed"
        assert result.invoice_id == str(invoice.id)
        assert result.farm_id == str(farm.id)
        assert result.source_type == "xml"
        assert result.final_invoice_status in (
            "completed",
            "needs_review",
        )

        # Extraction step
        assert result.steps.extraction is not None
        assert result.steps.extraction.outcome == "completed"
        assert result.steps.extraction.extracted_line_count == 2
        assert result.steps.extraction.extraction_method == "efactura_lxml"

        # Classification step
        assert result.steps.classification is not None
        assert result.steps.classification.outcome in (
            "completed",
            "skipped",
        )

        # Normalization step
        assert result.steps.normalization is not None
        assert result.steps.normalization.outcome == "completed"

        # Validation step
        assert result.steps.validation is not None
        assert result.steps.validation.outcome == "completed"

        # Alert + explanation payloads exist
        assert result.alerts_payload is not None
        assert result.explanations_payload is not None

    async def test_pipeline_missing_invoice_not_found(
        self, db_session: AsyncSession
    ) -> None:
        """Non-existent invoice → not_found outcome."""
        farm = await seed_farm(db_session)
        fake_invoice_id = uuid4()

        result = await resolve_xml_invoice_processing(
            db_session,
            invoice_id=fake_invoice_id,
            farm_id=farm.id,
        )

        assert result.overall_outcome == "not_found"
        assert result.final_invoice_status is None

    async def test_pipeline_non_xml_source_unsupported(
        self, db_session: AsyncSession
    ) -> None:
        """Non-XML source type → unsupported_source outcome."""
        farm = await seed_farm(db_session)
        doc = await seed_uploaded_document(
            db_session,
            farm.id,
            source_type="pdf",
            storage_path="/tmp/test.pdf",
        )
        invoice = await seed_invoice(
            db_session, farm.id, doc.id, status="uploaded"
        )

        result = await resolve_xml_invoice_processing(
            db_session,
            invoice_id=invoice.id,
            farm_id=farm.id,
        )

        assert result.overall_outcome == "unsupported_source"
        assert result.final_invoice_status is None
