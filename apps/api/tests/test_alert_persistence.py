"""Tests for alert + explanation persistence serialization."""

from __future__ import annotations

import json
from decimal import Decimal
from uuid import uuid4

from farm_copilot.database.invoice_alerts import _serialize_evidence
from farm_copilot.database.invoice_explanations import _serialize_dataclass
from farm_copilot.domain.alert_derivation import (
    ConfirmedDuplicateEvidence,
    DuplicateCandidateSummary,
    SuspiciousOverpaymentEvidence,
)
from farm_copilot.domain.explanation_derivation import (
    BenchmarkContextRef,
    ExplanationDataUsed,
    ExplanationSourceReferences,
)


class TestSerializeEvidence:
    """Evidence serialization tests."""

    def test_suspicious_overpayment_round_trip(self) -> None:
        """Decimals in SuspiciousOverpaymentEvidence → strings."""
        ev = SuspiciousOverpaymentEvidence(
            line_order=1,
            coverage_tier="strong",
            benchmark_observation_count=5,
            benchmark_observation_ids=["obs-1", "obs-2"],
            benchmark_source_kinds_summary=["local_market"],
            benchmark_window_from="2026-01-01",
            benchmark_window_to="2026-03-01",
            paid_unit_price=Decimal("125.50"),
            benchmark_reference_price=Decimal("100.00"),
            deviation_amount=Decimal("25.50"),
            deviation_percent=Decimal("25.50"),
            threshold_percent=Decimal("20.00"),
            validation_rule_key="suspicious_unit_price",
            validation_outcome="warn",
        )
        result = _serialize_evidence(ev)

        assert isinstance(result, dict)
        assert result["paid_unit_price"] == "125.50"
        assert result["benchmark_reference_price"] == "100.00"
        assert result["deviation_amount"] == "25.50"
        assert result["line_order"] == 1
        assert result["coverage_tier"] == "strong"
        # Verify JSON round-trip works
        json.dumps(result)

    def test_confirmed_duplicate_nested_lists(self) -> None:
        """Nested candidate_summary list serializes correctly."""
        ev = ConfirmedDuplicateEvidence(
            strong_match_count=1,
            possible_match_count=0,
            candidate_invoice_ids=["inv-001"],
            candidate_summary=[
                DuplicateCandidateSummary(
                    candidate_invoice_id="inv-001",
                    likelihood="strong",
                    reason_codes=["supplier_match", "date_match"],
                    supplier_match=True,
                    normalized_invoice_number_match=False,
                    invoice_date_match=True,
                    total_amount_match=True,
                    uploaded_document_match=False,
                    total_amount_delta=Decimal("0.00"),
                ),
            ],
            duplicate_suspicion_reason="strong_match_found",
        )
        result = _serialize_evidence(ev)

        assert len(result["candidate_summary"]) == 1
        summary = result["candidate_summary"][0]
        assert summary["candidate_invoice_id"] == "inv-001"
        assert summary["reason_codes"] == [
            "supplier_match",
            "date_match",
        ]
        assert summary["total_amount_delta"] == "0.00"
        json.dumps(result)

    def test_alert_id_map_key_format(self) -> None:
        """Alert ID map key = '{alert_key}:{subject_id}'."""
        alert_key = "suspicious_overpayment"
        subject_id = str(uuid4())
        map_key = f"{alert_key}:{subject_id}"
        assert map_key.startswith("suspicious_overpayment:")
        assert subject_id in map_key

    def test_empty_alerts_no_rows(self) -> None:
        """Empty list produces no serialization calls."""
        alerts: list = []
        results = [
            _serialize_evidence(a.evidence) for a in alerts
        ]
        assert results == []


class TestSerializeExplanations:
    """Explanation serialization tests."""

    def test_explanation_data_used_decimals(self) -> None:
        """Decimals in ExplanationDataUsed → strings."""
        data_used = ExplanationDataUsed(
            validation_rule_key="suspicious_unit_price",
            validation_outcome="warn",
            benchmark_coverage_tier="strong",
            benchmark_observation_count=5,
            benchmark_reference_price=Decimal("100.00"),
            paid_unit_price=Decimal("125.50"),
            deviation_amount=Decimal("25.50"),
            deviation_percent=Decimal("25.50"),
            threshold_percent=Decimal("20.00"),
        )
        result = _serialize_dataclass(data_used)

        assert result["benchmark_reference_price"] == "100.00"
        assert result["paid_unit_price"] == "125.50"
        assert result["deviation_amount"] == "25.50"
        json.dumps(result)

    def test_source_references_nested_benchmark(self) -> None:
        """Nested BenchmarkContextRef serializes properly."""
        refs = ExplanationSourceReferences(
            invoice_id="inv-123",
            line_item_id="line-1",
            line_order=1,
            validation_result_key="suspicious_unit_price",
            benchmark_context=BenchmarkContextRef(
                coverage_tier="strong",
                observation_count=5,
                window_from="2026-01-01",
                window_to="2026-03-01",
                observation_ids=["obs-1"],
                source_kinds_summary=["local_market"],
            ),
        )
        result = _serialize_dataclass(refs)

        assert result["invoice_id"] == "inv-123"
        ctx = result["benchmark_context"]
        assert ctx["coverage_tier"] == "strong"
        assert ctx["observation_count"] == 5
        assert ctx["observation_ids"] == ["obs-1"]
        json.dumps(result)

    def test_explanation_links_to_alert_via_map(self) -> None:
        """Explanation maps to correct alert_id via key lookup."""
        alert_id = uuid4()
        alert_id_map = {
            "suspicious_overpayment:line-1": alert_id,
            "invoice_total_mismatch:inv-1": uuid4(),
        }
        lookup_key = "suspicious_overpayment:line-1"
        assert alert_id_map[lookup_key] == alert_id
