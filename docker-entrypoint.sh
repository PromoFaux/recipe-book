#!/bin/sh
set -e

# Apply any schema changes to the database.
# --skip-generate: client was already generated at build time, and the nextjs
# user has no write access to node_modules at runtime anyway.
echo "Applying database schema..."
node ./node_modules/prisma/build/index.js db push

echo "Cleaning up orphaned tags..."
node -e "
const { DatabaseSync } = require('node:sqlite');
const url = process.env.DATABASE_URL || 'file:/app/data/recipes.db';
const path = url.replace(/^file:/, '');
const db = new DatabaseSync(path);
const { changes } = db.prepare('DELETE FROM Tag WHERE id NOT IN (SELECT tagId FROM TagsOnRecipes)').run();
console.log('Deleted ' + changes + ' orphaned tag(s).');
db.close();
"

echo "Starting server..."
exec node server.js
