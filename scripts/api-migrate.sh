#!/usr/bin/env bash
# Apply Alembic migrations to the database pointed at by DATABASE_URL.
# Usage:
#   ./scripts/api-migrate.sh                  -> alembic upgrade head against local
#   ./scripts/api-migrate.sh downgrade -1     -> pass-through to alembic
set -euo pipefail

cd "$(dirname "$0")/../apps/api"

if [[ -f ../../.env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source ../../.env
  set +o allexport
fi

if [[ $# -eq 0 ]]; then
  exec uv run alembic upgrade head
else
  exec uv run alembic "$@"
fi
