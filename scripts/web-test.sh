#!/usr/bin/env bash
# Run the frontend test suite (Vitest by default).
# Examples:
#   ./scripts/web-test.sh                  -> pnpm test
#   ./scripts/web-test.sh e2e              -> pnpm e2e
#   ./scripts/web-test.sh type-check       -> pnpm type-check
set -euo pipefail

cd "$(dirname "$0")/../apps/web"

if [[ $# -eq 0 ]]; then
  exec pnpm test
else
  exec pnpm "$@"
fi
