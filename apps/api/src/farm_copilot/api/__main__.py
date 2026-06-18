"""Entry point for ``python -m farm_copilot.api``."""

from __future__ import annotations

import uvicorn


def main() -> None:
    """Run the development server."""
    uvicorn.run(
        "farm_copilot.api.app:app",
        host="0.0.0.0",  # noqa: S104
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()
