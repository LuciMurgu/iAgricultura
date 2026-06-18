"""Tests for pre-seeded Romanian agricultural product catalog.

Pure-logic tests validating SEED_CATALOG structure and integrity.
"""

from __future__ import annotations

from farm_copilot.database.seed_catalog import SEED_CATALOG

# ---------------------------------------------------------------------------
# Structure tests
# ---------------------------------------------------------------------------


class TestSeedCatalogStructure:
    def test_every_item_has_required_fields(self) -> None:
        """Every item must have name, category, default_unit, aliases."""
        for i, item in enumerate(SEED_CATALOG):
            assert "name" in item, f"Item {i} missing 'name'"
            assert "category" in item, f"Item {i} missing 'category'"
            assert "default_unit" in item, f"Item {i} missing 'default_unit'"
            assert "aliases" in item, f"Item {i} missing 'aliases'"
            assert isinstance(item["aliases"], list), (
                f"Item {i} aliases is not a list"
            )
            assert len(item["aliases"]) > 0, (  # type: ignore[arg-type]
                f"Item {i} ({item['name']}) has empty aliases"
            )

    def test_no_duplicate_product_names(self) -> None:
        """All product names must be unique."""
        names = [str(item["name"]) for item in SEED_CATALOG]
        assert len(names) == len(set(names)), (
            f"Duplicate names: {[n for n in names if names.count(n) > 1]}"
        )

    def test_no_duplicate_aliases_within_product(self) -> None:
        """No repeated alias text within one product."""
        for item in SEED_CATALOG:
            aliases = [str(a).lower().strip() for a in item["aliases"]]  # type: ignore[union-attr]
            assert len(aliases) == len(set(aliases)), (
                f"Product '{item['name']}' has duplicate aliases: "
                f"{[a for a in aliases if aliases.count(a) > 1]}"
            )

    def test_all_aliases_are_lowercase(self) -> None:
        """All alias texts should already be lowercase."""
        for item in SEED_CATALOG:
            for alias in item["aliases"]:  # type: ignore[union-attr]
                assert str(alias) == str(alias).lower(), (
                    f"Product '{item['name']}' alias not lowercase: '{alias}'"
                )


# ---------------------------------------------------------------------------
# Category coverage tests
# ---------------------------------------------------------------------------


class TestCatalogCoverage:
    def test_minimum_product_count(self) -> None:
        """Catalog must have at least 28 products."""
        assert len(SEED_CATALOG) >= 28

    def test_key_categories_present(self) -> None:
        """Catalog must cover major categories."""
        categories = {str(item["category"]) for item in SEED_CATALOG}
        for expected in ["fertilizer", "herbicide", "seed", "fuel"]:
            assert expected in categories, (
                f"Missing category: {expected}"
            )

    def test_minimum_alias_count(self) -> None:
        """Catalog must have at least 150 aliases total."""
        total = sum(len(item["aliases"]) for item in SEED_CATALOG)  # type: ignore[arg-type]
        assert total >= 150, f"Only {total} aliases, need ≥150"

    def test_valid_units(self) -> None:
        """All default_unit values must be recognized UOM codes."""
        valid_units = {"KGM", "LTR", "MTR", "BUC", "TNE"}
        for item in SEED_CATALOG:
            unit = str(item["default_unit"])
            assert unit in valid_units, (
                f"Product '{item['name']}' has invalid unit: '{unit}'"
            )


# ---------------------------------------------------------------------------
# Seed function contract tests
# ---------------------------------------------------------------------------


class TestSeedFunctionContract:
    def test_function_exists(self) -> None:
        from farm_copilot.database.seed_catalog import seed_product_catalog

        assert callable(seed_product_catalog)

    def test_return_type_documented(self) -> None:
        """Verify seed_product_catalog has proper annotations."""
        from farm_copilot.database.seed_catalog import seed_product_catalog

        annotations = seed_product_catalog.__annotations__
        assert "return" in annotations
