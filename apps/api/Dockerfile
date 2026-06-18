# Multi-stage build with uv for fast installs
FROM python:3.12-slim AS base

# Install system dependencies for lxml + asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 libxslt1.1 libpq5 \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev libxslt1-dev libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first (cache layer). Install only third-party deps here
# (--no-install-project): the app runs via PYTHONPATH=/app/src, so the project
# itself is not built as a wheel (which would require README.md + src/ at this layer).
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen --no-install-project

# Copy application code
COPY src/ src/
COPY migrations/ migrations/
COPY alembic.ini ./

FROM base AS runtime

WORKDIR /app

# Copy installed packages and app from builder
COPY --from=builder /app /app

# Copy uv for runtime use (alembic needs it)
COPY --from=builder /usr/local/bin/uv /usr/local/bin/uv

# Create non-root user
RUN useradd -m -r appuser && \
    mkdir -p /app/uploads /app/anaf_downloads /app/.cache/transformers && \
    chown -R appuser:appuser /app

USER appuser

# Set Python path
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE="/app/.cache/transformers"

EXPOSE 8000

# Health check (honors $PORT when the platform injects one, defaults to 8000)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import os, httpx; p = os.environ.get('PORT', '8000'); r = httpx.get(f'http://localhost:{p}/health'); r.raise_for_status()"

CMD ["python", "-m", "farm_copilot.api.production"]
