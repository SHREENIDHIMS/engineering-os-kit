#!/usr/bin/env sh
set -eu
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LAUNCHER="$PROJECT_ROOT/scripts/engineering-os.mjs"

if [ ! -f "$LAUNCHER" ]; then
  echo "Engineering OS not installed. Run: node scripts/engineering-os.mjs init-project" >&2
  exit 1
fi

exec node "$LAUNCHER" pre-task-check
