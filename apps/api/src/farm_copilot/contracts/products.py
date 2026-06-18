"""Pydantic v2 models for product-related DTOs.

Used for API request/response serialization and OpenAPI schema generation.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CanonicalProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: str | None
    default_unit: str | None
    active: bool


class ProductAliasResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    canonical_product_id: UUID
    alias_text: str
    farm_id: UUID | None
    supplier_id: UUID | None
    source: str | None
