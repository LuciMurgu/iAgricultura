"""Auth redirect middleware — protects routes from unauthenticated access."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response


class AuthRedirectMiddleware(BaseHTTPMiddleware):
    """Redirect unauthenticated users to /login for protected routes."""

    PUBLIC_PATHS = {"/login", "/register", "/health"}
    PUBLIC_PREFIXES = ("/static", "/anaf", "/api/v1")

    async def dispatch(
        self, request: Request, call_next: object
    ) -> Response:
        """Check session for user_id; redirect if missing."""
        path = request.url.path

        # Allow public paths
        if path in self.PUBLIC_PATHS:
            return await call_next(request)  # type: ignore[misc]

        # Allow public prefixes (static files, etc.)
        if path.startswith(self.PUBLIC_PREFIXES):
            return await call_next(request)  # type: ignore[misc]

        # Check authentication
        user_id = request.session.get("user_id")
        if not user_id:
            return RedirectResponse(url="/login", status_code=302)

        return await call_next(request)  # type: ignore[misc]
