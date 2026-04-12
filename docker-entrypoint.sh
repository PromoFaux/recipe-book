#!/bin/sh
set -e

# Apply any schema changes to the database.
# --skip-generate: client was already generated at build time, and the nextjs
# user has no write access to node_modules at runtime anyway.
echo "Applying database schema..."
node ./node_modules/prisma/build/index.js db push

echo "Cleaning up orphaned tags..."
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const url = process.env.DATABASE_URL || 'file:./data/recipes.db';
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
db.tag.deleteMany({ where: { recipes: { none: {} } } })
  .then(r => { console.log('Deleted ' + r.count + ' orphaned tag(s).'); return db.\$disconnect(); })
  .catch(e => { console.error('Tag cleanup failed:', e); return db.\$disconnect(); });
"

echo "Starting server..."
exec node server.js
