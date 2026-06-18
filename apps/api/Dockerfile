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

# Copy dependency files first (cache layer)
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen

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

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8000/health'); r.raise_for_status()"

CMD ["python", "-m", "farm_copilot.api.production"]
