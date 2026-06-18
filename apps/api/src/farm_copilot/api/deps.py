"""Dependencies — database session, auth helpers, app settings."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.session import get_db


class AppSettings(BaseSettings):
    """Application settings from environment."""

    session_secret_key: str = "CHANGE-ME-IN-PRODUCTION"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


app_settings = AppSettings()


def get_current_user_id(request: Request) -> UUID | None:
    """Extract user_id from session. Returns None if not logged in."""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return UUID(user_id)


def get_current_farm_id(request: Request) -> UUID | None:
    """Extract active farm_id from session. Returns None if not set."""
    farm_id = request.session.get("farm_id")
    if not farm_id:
        return None
    return UUID(farm_id)


def require_auth(request: Request) -> UUID:
    """Get farm_id from session or raise redirect to login.

    Use in route handlers: farm_id = require_auth(request)
    """
    farm_id = get_current_farm_id(request)
    if farm_id is None:
        raise RedirectResponse(url="/login", status_code=302)  # type: ignore[misc]
    return farm_id


# ---------------------------------------------------------------------------
# JSON API auth dependency
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ApiUser:
    """Authenticated user context for /api/v1 routes."""

    user_id: UUID
    farm_id: UUID
    farm_name: str
    user_name: str


async def get_current_user_api(
    request: Request,
    session: AsyncSession = Depends(get_db),  # noqa: B008
) -> ApiUser:
    """Dependency for /api/v1 routes — returns 401 JSON, never redirects."""
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Autentificare necesară")

    farm_id = request.session.get("farm_id")
    if not farm_id:
        raise HTTPException(status_code=401, detail="Nici o fermă selectată")

    return ApiUser(
        user_id=UUID(user_id),
        farm_id=UUID(farm_id),
        farm_name=request.session.get("farm_name", ""),
        user_name=request.session.get("user_name", ""),
    )


__all__ = [
    "ApiUser",
    "AppSettings",
    "app_settings",
    "get_current_farm_id",
    "get_current_user_api",
    "get_current_user_id",
    "get_db",
    "require_auth",
]
