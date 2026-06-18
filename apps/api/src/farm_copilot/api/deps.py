"""Dependencies — database session, auth helpers, app settings."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import AsyncSession

from farm_copilot.database.session import (
    LOCAL_DEFAULT_DATABASE_URL,
    get_database_url,
    get_db,
)

INSECURE_SECRET_DEFAULT = "CHANGE-ME-IN-PRODUCTION"


class AppSettings(BaseSettings):
    """Application settings from environment."""

    session_secret_key: str = INSECURE_SECRET_DEFAULT
    # "development" | "production". Drives cookie hardening and startup checks.
    env: str = "development"
    # Exact SPA origin allowed by CORS, e.g. "https://iagricultura.ro".
    frontend_url: str = ""
    # Cookie scope so the session survives web<->api subdomain calls,
    # e.g. ".iagricultura.ro". Empty means host-only (fine for localhost).
    session_cookie_domain: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def is_production(self) -> bool:
        return self.env.strip().lower() == "production"

    @property
    def session_https_only(self) -> bool:
        """Only mark the session cookie Secure in production (HTTPS)."""
        return self.is_production


app_settings = AppSettings()


def validate_production_settings(settings: AppSettings | None = None) -> None:
    """Fail fast when running in production with insecure defaults.

    Raises RuntimeError listing every misconfiguration so the container exits
    loudly instead of silently serving with a known secret or the local DB.
    """
    settings = settings or app_settings
    if not settings.is_production:
        return

    errors: list[str] = []

    if not settings.session_secret_key or settings.session_secret_key == INSECURE_SECRET_DEFAULT:
        errors.append(
            "SESSION_SECRET_KEY must be set to a strong, unique value in production "
            "(currently the insecure default)."
        )

    if not settings.frontend_url:
        errors.append(
            "FRONTEND_URL must be set in production so CORS allows the SPA origin."
        )

    if get_database_url() == LOCAL_DEFAULT_DATABASE_URL:
        errors.append(
            "DATABASE_URL must point at the production database, not the local default."
        )

    if errors:
        raise RuntimeError(
            "Refusing to start in production due to insecure configuration:\n  - "
            + "\n  - ".join(errors)
        )


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
    "validate_production_settings",
]
