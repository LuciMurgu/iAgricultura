#!/usr/bin/env bash
# Stop and remove local development containers.
# Add --volumes to also wipe the local Postgres data: ./scripts/dev-down.sh --volumes
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose -f docker-compose.dev.yml down "$@"
