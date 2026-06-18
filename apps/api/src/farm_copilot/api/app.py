"""FastAPI application factory."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from farm_copilot.api.deps import app_settings
from farm_copilot.api.logging_config import setup_logging
from farm_copilot.api.middleware import AuthRedirectMiddleware
from farm_copilot.api.routes.anaf import router as anaf_router
from farm_copilot.api.routes.api_v1 import router as api_v1_router
from farm_copilot.api.routes.auth_routes import router as auth_router
from farm_copilot.api.routes.export import router as export_router
from farm_copilot.api.routes.health import router as health_router
from farm_copilot.api.routes.invoice import router as invoice_router
from farm_copilot.api.routes.stock import router as stock_router
from farm_copilot.api.routes.upload import router as upload_router
from farm_copilot.api.templates import STATIC_DIR
from farm_copilot.worker.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """FastAPI lifespan — start/stop background scheduler."""
    setup_logging()
    start_scheduler()
    yield
    await stop_scheduler()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    application = FastAPI(
        title="Farm Copilot",
        description="Invoice processing pipeline for Romanian farms",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Auth redirect middleware (checks session for HTML routes)
    application.add_middleware(AuthRedirectMiddleware)
    application.add_middleware(
        SessionMiddleware,
        secret_key=app_settings.session_secret_key,
        max_age=86400 * 7,  # 7-day session
    )

    # CORS for SPA frontend
    frontend_url = os.getenv("FRONTEND_URL", "")
    allow_origins = ["http://localhost:3000"]
    if frontend_url:
        allow_origins.append(frontend_url)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Static files
    application.mount(
        "/static", StaticFiles(directory=str(STATIC_DIR)), name="static"
    )

    # HTML routes (existing)
    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(upload_router)
    application.include_router(invoice_router)
    application.include_router(stock_router)
    application.include_router(export_router)
    application.include_router(anaf_router)

    # JSON API v1
    application.include_router(api_v1_router, prefix="/api/v1")

    return application


app = create_app()
