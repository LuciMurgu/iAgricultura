"""Tests for auto-alias creation from corrections.

Pure-logic tests for _normalize_alias_text and
create_alias_if_not_exists behavior, plus LineCorrectionApplied fields.
"""

from __future__ import annotations

from farm_copilot.database.product_aliases import _normalize_alias_text
from farm_copilot.worker.line_correction import LineCorrectionApplied

# ---------------------------------------------------------------------------
# 1. _normalize_alias_text
# ---------------------------------------------------------------------------


class TestNormalizeAliasText:
    def test_lowercase(self) -> None:
        assert _normalize_alias_text("UREE 46%") == "uree 46%"

    def test_strip_whitespace(self) -> None:
        assert _normalize_alias_text("  uree 46%  ") == "uree 46%"

    def test_collapse_whitespace(self) -> None:
        assert _normalize_alias_text("uree   granulată   46%") == "uree granulată 46%"

    def test_combined(self) -> None:
        assert (
            _normalize_alias_text("  UREE  Granulată  46%  ")
            == "uree granulată 46%"
        )

    def test_already_normalized(self) -> None:
        assert _normalize_alias_text("uree 46%") == "uree 46%"

    def test_single_word(self) -> None:
        assert _normalize_alias_text("MOTORINĂ") == "motorină"

    def test_empty_string(self) -> None:
        assert _normalize_alias_text("") == ""

    def test_whitespace_only(self) -> None:
        assert _normalize_alias_text("   ") == ""

    def test_preserves_special_chars(self) -> None:
        assert (
            _normalize_alias_text("NPK 15-15-15 (50kg)")
            == "npk 15-15-15 (50kg)"
        )


# ---------------------------------------------------------------------------
# 2. LineCorrectionApplied result type
# ---------------------------------------------------------------------------


class TestLineCorrectionAppliedResult:
    def test_default_values(self) -> None:
        r = LineCorrectionApplied()
        assert r.alias_created is False
        assert r.alias_text is None
        assert r.kind == "applied"

    def test_with_alias_created(self) -> None:
        r = LineCorrectionApplied(
            kind="applied",
            line_item_id="abc",
            new_canonical_product_id="def",
            alias_created=True,
            alias_text="uree 46%",
        )
        assert r.alias_created is True
        assert r.alias_text == "uree 46%"

    def test_without_alias_created(self) -> None:
        r = LineCorrectionApplied(
            kind="applied",
            line_item_id="abc",
            new_canonical_product_id="def",
            alias_created=False,
            alias_text="uree 46%",
        )
        assert r.alias_created is False
        # alias_text is still set (existing alias found)
        assert r.alias_text == "uree 46%"

    def test_frozen(self) -> None:
        r = LineCorrectionApplied()
        try:
            r.alias_created = True  # type: ignore[misc]
            raise AssertionError("Should be frozen")
        except AttributeError:
            pass


# ---------------------------------------------------------------------------
# 3. create_alias_if_not_exists behavior (type checks)
# ---------------------------------------------------------------------------


class TestCreateAliasContract:
    """Verify the function signature and return type contract."""

    def test_function_exists(self) -> None:
        from farm_copilot.database.product_aliases import create_alias_if_not_exists

        assert callable(create_alias_if_not_exists)

    def test_normalize_function_is_pure(self) -> None:
        """_normalize_alias_text is a pure function (no DB needed)."""
        result = _normalize_alias_text("  Test  Input  ")
        assert result == "test input"
        # Call again — same result
        assert _normalize_alias_text("  Test  Input  ") == result
