#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATIONS:-false}" = "true" ]; then
  echo "Skipping database migrations (SKIP_DB_MIGRATIONS=true)"
else
  echo "Running database migrations..."
  bun run migrate:deploy
fi

echo "Starting Career Quest API..."
exec bun src/index.ts
