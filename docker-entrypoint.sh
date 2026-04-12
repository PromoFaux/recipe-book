#!/bin/sh
set -e

# Push schema to DB (creates tables if DB is new, safe to re-run)
echo "Applying database schema..."
npx prisma db push --skip-generate --accept-data-loss=false

echo "Starting server..."
exec node server.js
