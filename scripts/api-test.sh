#!/usr/bin/env bash
# Run the backend test suite. All extra args pass through to pytest.
# Examples:
#   ./scripts/api-test.sh
#   ./scripts/api-test.sh tests/domain
#   ./scripts/api-test.sh -k normalization
set -euo pipefail

cd "$(dirname "$0")/../apps/api"

exec uv run pytest "$@"
