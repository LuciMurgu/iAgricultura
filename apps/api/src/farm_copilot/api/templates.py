"""Jinja2 template configuration."""

from __future__ import annotations

from pathlib import Path

from fastapi.templating import Jinja2Templates

VIEWS_DIR = Path(__file__).resolve().parent / "views"
STATIC_DIR = Path(__file__).resolve().parent / "static"

templates = Jinja2Templates(directory=str(VIEWS_DIR))
