# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Install dependencies for sharp and prisma
RUN apk add --no-cache libc6-compat openssl tar

WORKDIR /app

# ── deps stage ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ── builder stage ────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── prisma-runtime stage ─────────────────────────────────────────────────────
# Install ONLY the prisma CLI and its transitive deps. Everything the Next.js
# app needs at runtime is already traced into .next/standalone/node_modules.
FROM base AS prisma-runtime
WORKDIR /app
COPY package-lock.json* ./
# Extract the exact locked prisma version, install only that package.
RUN node -e " \
  const lock = require('./package-lock.json'); \
  const ver = lock.packages['node_modules/prisma'].version; \
  require('fs').writeFileSync('package.json', JSON.stringify({dependencies:{prisma: ver}})); \
  "
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

# ── runner stage ─────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and config for db push at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Production node_modules (no dev deps) — provides the prisma CLI for db push.
# The standalone output already supplies the app's traced runtime deps.
COPY --from=prisma-runtime /app/node_modules ./node_modules

# Startup script
COPY --chmod=0755 docker-entrypoint.sh ./docker-entrypoint.sh

# Create data directory and set ownership
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:3000/api/auth/providers || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
