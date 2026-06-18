"""Structured logging configuration."""

from __future__ import annotations

import logging


def setup_logging(level: str = "INFO") -> None:
    """Configure logging with structured format."""
    logging.basicConfig(
        level=level,
        format=(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        ),
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # Quiet noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
