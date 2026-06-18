#!/usr/bin/env bash
# Start the local development stack: Postgres + API + Web.
# All running in foreground compose; Ctrl+C stops everything.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "[dev-up] .env not found. Copying .env.example."
  cp .env.example .env
fi

echo "[dev-up] Building and starting services..."
docker compose -f docker-compose.dev.yml up --build "$@"
