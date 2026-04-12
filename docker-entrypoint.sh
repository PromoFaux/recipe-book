#!/bin/sh
set -e

# Apply any schema changes to the database.
# Uses the locally installed Prisma CLI (copied from builder stage) rather
# than npx, which would download the latest version and risk a version mismatch.
# This is a no-op if the schema is already up to date.
echo "Applying database schema..."
node ./node_modules/prisma/build/index.js db push

echo "Starting server..."
exec node server.js
