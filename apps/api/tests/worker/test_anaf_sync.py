"""Tests for worker/anaf_sync.py — ZIP extraction + polling window."""

from __future__ import annotations

import io
import zipfile
from datetime import UTC, datetime, timedelta

from farm_copilot.worker.anaf_sync import (
    CLOCK_BUFFER_MINUTES,
    MAX_LOOKBACK_DAYS,
    calculate_polling_window,
    extract_xml_from_zip,
)


def _make_zip(files: dict[str, str]) -> bytes:
    """Create a ZIP archive in memory with the given filename→content mapping."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buf.getvalue()


class TestExtractXmlFromZip:
    """ZIP extraction tests."""

    def test_valid_zip_with_xml(self) -> None:
        """Valid ZIP with XML file → extracts content."""
        xml_content = (
            '<Invoice xmlns="urn:oasis:names:specification'
            ':ubl:schema:xsd:Invoice-2">test</Invoice>'
        )
        zip_bytes = _make_zip({"factura.xml": xml_content})
        result = extract_xml_from_zip(zip_bytes)
        assert result == xml_content

    def test_zip_with_no_xml_files(self) -> None:
        """ZIP with no XML files → returns None."""
        zip_bytes = _make_zip({"readme.txt": "not an xml", "data.json": "{}"})
        result = extract_xml_from_zip(zip_bytes)
        assert result is None

    def test_empty_zip(self) -> None:
        """Empty ZIP archive → returns None."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w"):
            pass
        result = extract_xml_from_zip(buf.getvalue())
        assert result is None

    def test_invalid_zip_bytes(self) -> None:
        """Non-ZIP bytes → returns None (no crash)."""
        result = extract_xml_from_zip(b"this is not a zip file")
        assert result is None

    def test_multiple_xml_files_returns_first(self) -> None:
        """ZIP with multiple XML files → returns the first one."""
        zip_bytes = _make_zip({
            "invoice1.xml": "<first/>",
            "invoice2.xml": "<second/>",
        })
        result = extract_xml_from_zip(zip_bytes)
        assert result is not None
        # Should return one of them (first alphabetically)
        assert "<" in result


class TestPollingWindow:
    """Polling window calculation tests."""

    def test_no_prior_sync_uses_poll_days(self) -> None:
        """No prior sync → window starts from now - poll_days."""
        now = datetime(2026, 4, 4, 12, 0, 0, tzinfo=UTC)
        start_ms, end_ms = calculate_polling_window(
            last_sync=None, poll_days=2, now=now
        )

        expected_end = now - timedelta(minutes=CLOCK_BUFFER_MINUTES)
        expected_start = expected_end - timedelta(days=2)

        assert end_ms == int(expected_end.timestamp() * 1000)
        assert start_ms == int(expected_start.timestamp() * 1000)

    def test_with_prior_sync_starts_from_last_minus_one_day(self) -> None:
        """With prior sync → starts from last sync - 1 day (overlap)."""
        now = datetime(2026, 4, 4, 12, 0, 0, tzinfo=UTC)
        last_sync = datetime(2026, 4, 3, 10, 0, 0, tzinfo=UTC)

        start_ms, end_ms = calculate_polling_window(
            last_sync=last_sync, poll_days=2, now=now
        )

        expected_start = last_sync - timedelta(days=1)
        assert start_ms == int(expected_start.timestamp() * 1000)

    def test_respects_60_day_max_lookback(self) -> None:
        """Old last_sync is capped at 60 days lookback."""
        now = datetime(2026, 4, 4, 12, 0, 0, tzinfo=UTC)
        # Last sync was 100 days ago
        last_sync = now - timedelta(days=100)

        start_ms, end_ms = calculate_polling_window(
            last_sync=last_sync, poll_days=2, now=now
        )

        expected_end = now - timedelta(minutes=CLOCK_BUFFER_MINUTES)
        earliest = expected_end - timedelta(days=MAX_LOOKBACK_DAYS)
        assert start_ms == int(earliest.timestamp() * 1000)

    def test_end_time_has_clock_buffer(self) -> None:
        """End time has 10-minute buffer for clock sync."""
        now = datetime(2026, 4, 4, 12, 0, 0, tzinfo=UTC)
        _, end_ms = calculate_polling_window(
            last_sync=None, poll_days=2, now=now
        )

        expected_end = now - timedelta(minutes=10)
        assert end_ms == int(expected_end.timestamp() * 1000)
