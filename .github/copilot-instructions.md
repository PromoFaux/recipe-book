# Copilot Cloud Agent Instructions — Recipe Book

## Overview

**Recipe Book** is a self-hosted family recipe manager. It is a full-stack **Next.js 15** (App Router) application using **React 19**, **TypeScript 5**, **Prisma 5** with **SQLite**, **NextAuth.js 5 (beta)** for Google OAuth, and **Tailwind CSS 3**. It ships as a single Docker image (multi-arch: amd64/arm64). There is no test suite. There is no README.

## Build & Validate — Exact Commands

**Always run these in order.** The build script (`npm run build`) runs `prisma generate && next build`, but when developing you should run them separately for clearer errors.

```bash
npm install                   # install dependencies (always run first)
npx prisma generate           # generate Prisma client (required before build or dev)
npx tsc --noEmit              # type-check only — zero output on success
npm run build                 # full production build (prisma generate + next build)
npm run dev                   # start dev server on http://localhost:3000
```

### Critical Notes

- **`prisma generate` will fail with EPERM** if the dev server (`npm run dev`) is running, because it holds a lock on the Prisma query engine DLL. Always stop the dev server before running `prisma generate` or `npm run build`.
- **`npm run lint` (`next lint`) hangs on first run** because no `.eslintrc` file exists. Next.js prompts interactively to pick a config. This is unusable in non-interactive CI. To validate code, use `npx tsc --noEmit` instead.
- **No test suite exists.** There is no `test` script, no Jest/Vitest/Playwright. Use `npx tsc --noEmit` and `npm run build` as the validation steps.
- **`.env` is required.** Copy `.env.example` to `.env` for local dev. The key difference: local dev uses `DATABASE_URL="file:./data/recipes.db"` (relative path), while Docker uses `file:/app/data/recipes.db`.
- The `data/` directory (SQLite DB only — photos are stored as blobs in the DB) is gitignored. It is created automatically on first run.
- `prisma/migrations/` is gitignored. Schema changes are applied at runtime via `prisma db push` (in Docker entrypoint), not via committed migrations.

### Validation Checklist (in order)

1. `npx tsc --noEmit` — must exit 0 with no output
2. `npm run build` — must complete showing route table with no errors

## Project Layout

```
├── .github/workflows/docker.yml   # CI: Docker build + push to GHCR + Portainer deploy
├── prisma/schema.prisma           # Database schema (SQLite) — the source of truth for data models
├── middleware.ts                   # Auth guard: redirects unauthenticated users to /login
├── next.config.ts                 # Next.js config: standalone output, sharp + prisma external packages
├── tailwind.config.ts             # Tailwind: custom "brand" color palette, Geist font, typography plugin
├── tsconfig.json                  # TypeScript: strict mode, paths alias @/* → ./src/*
├── docker-compose.yml             # Production deployment config
├── Dockerfile                     # Multi-stage build: deps → builder → runner (node:20-alpine)
├── docker-entrypoint.sh           # Runs `prisma db push --skip-generate` then starts server.js
├── src/
│   ├── auth.ts                    # NextAuth config: Google OAuth, allow-list, PrismaAdapter
│   ├── lib/
│   │   ├── db.ts                  # Singleton PrismaClient (cached in globalThis for HMR)
│   │   ├── utils.ts               # cn() helper (clsx + tailwind-merge), formatDuration()
│   │   └── measurements.ts        # US→metric conversion, temperature conversion, unit options
│   ├── components/                # Shared React components
│   │   ├── ui/                    # Low-level UI: Badge, Button, Card, Dialog, Input, Switch, Textarea
│   │   ├── delete-recipe-button.tsx  # Client component: delete button + confirmation dialog
│   │   └── pwa-register.tsx       # Client component: registers /public/sw.js service worker
│   └── app/
│       ├── layout.tsx             # Root layout: Geist font, Toaster, SessionProvider, PWA meta
│       ├── icon.tsx               # Generated app icon (512×512 PNG via ImageResponse)
│       ├── apple-icon.tsx         # Generated Apple touch icon (180×180 PNG via ImageResponse)
│       ├── manifest.ts            # Web app manifest (PWA: standalone display, brand theme)
│       ├── globals.css            # Tailwind directives + custom styles
│       ├── (auth)/login/          # Login page (public)
│       ├── (app)/                 # Authenticated app shell (layout checks session, renders Nav)
│       │   ├── page.tsx           # Home: recipe grid with search + tag filter
│       │   ├── recipes/
│       │   │   ├── new/page.tsx   # Create recipe form
│       │   │   └── [id]/
│       │   │       ├── page.tsx   # Recipe detail view (includes Delete + Edit buttons)
│       │   │       └── edit/page.tsx  # Edit recipe form
│       │   └── settings/page.tsx  # User preferences (metric toggle, Google Drive backup)
│       ├── api/
│       │   ├── auth/[...nextauth]/route.ts   # NextAuth route handlers
│       │   ├── recipes/route.ts              # GET (list+search), POST (create)
│       │   ├── recipes/[id]/route.ts         # GET, PUT, DELETE single recipe
│       │   ├── tags/route.ts                 # GET all tags
│       │   ├── upload/route.ts               # POST photo (Sharp resize+store as DB blob), DELETE photo
│       │   ├── scrape/route.ts               # POST: extract recipe from URL via JSON-LD
│       │   ├── backup/route.ts               # POST: backup SQLite to Google Drive
│       │   └── user/preferences/route.ts     # PUT: toggle preferMetric
│       └── uploads/[...path]/route.ts        # Serve photos from DB blob (authenticated, cached)
└── public/sw.js                   # Minimal service worker for PWA install prompt
```

## Architecture Patterns

- **Path alias:** `@/*` maps to `./src/*`. Always use `@/` imports (e.g., `import { db } from "@/lib/db"`).
- **API routes** use Zod for request validation and return `NextResponse.json()`. All API routes check `auth()` session first.
- **Dynamic route params** in Next.js 15 are `Promise`-based: `{ params }: { params: Promise<{ id: string }> }` — always `await params`.
- **Recipe instructions** are stored as a JSON-stringified array of strings (`JSON.stringify(steps)`), not raw text.
- **Photos** are stored as binary blobs in the SQLite `Photo.data` column, served through `/uploads/[recipeId]/[filename]`.
- **Tags** use a many-to-many join table `TagsOnRecipes`. Tags are upserted by name.
- **UI components** in `src/components/ui/` are simple, self-contained (not shadcn/ui CLI-managed).

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path. Local: `file:./data/recipes.db` |
| `AUTH_SECRET` | Yes | NextAuth session encryption key |
| `AUTH_URL` | Yes | App URL for OAuth callbacks |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `ALLOWED_EMAILS` | Yes | Comma-separated Google emails allowed to log in |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | No | Google Drive folder for DB backups |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | GCP service account JSON for Drive API |

## CI Pipeline

The only CI workflow is `.github/workflows/docker.yml`. It runs on push and PRs to `main`:
- Builds a multi-platform Docker image (linux/amd64, linux/arm64)
- Pushes to `ghcr.io/promofaux/recipe-book` on main (not on PRs)
- Deploys to Portainer via webhook on main

There are **no CI steps that run linting, type-checking, or tests**. The CI pipeline only validates that the Docker image builds successfully (which includes `prisma generate` and `next build`).

## Trust These Instructions

These instructions have been validated against the actual codebase. Trust them and only perform additional searches if the information here is incomplete or found to be incorrect during your work.
