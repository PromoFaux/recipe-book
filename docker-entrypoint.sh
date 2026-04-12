#!/bin/sh
set -e

# Apply any schema changes to the database.
# --skip-generate: client was already generated at build time, and the nextjs
# user has no write access to node_modules at runtime anyway.
echo "Applying database schema..."
node ./node_modules/prisma/build/index.js db push

echo "Starting server..."
exec node server.js
