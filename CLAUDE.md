# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EOMail is a full-stack AI-powered email client with smart categorization, auto-replies, threat detection, financial document extraction, and calendar management. Live at **eomail.co**, deployed on Render with auto-deploy on push to `main`.

## Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` (Express + Vite HMR on port 5000) |
| Production build | `npm run build` (esbuild server → `dist/index.cjs`, Vite client → `dist/public/`) |
| Start production | `npm run start` |
| Type check | `npm run check` |
| DB migrate | `npm run db:push` (runs `db:fix` pre-migration script first, then `drizzle-kit push --force`) |

There are no tests configured in this project.

## CRITICAL — Git & Deployment Structure

**The git root is `~/` (home directory), NOT this project folder.** This means local commits push files to `Desktop/EOMail/EOMail-main/...` paths on GitHub, but Render expects files at the **repo root** (`package.json`, `server/`, `client/` at top level).

**To deploy:** Clone to `/tmp/eomail-deploy`, copy changed files to root level, commit/push from the clone. Use the `/deploy` skill which automates this workflow.

- **Render service ID:** `srv-d6m6tjv5r7bs73c8q0c0`
- **Render build:** `npm ci --include=dev && npm run build && npm run db:push`
- **Required env vars:** `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `DOMAIN`

## Architecture

### Tech Stack
- **Frontend:** React 18 + Vite 7 + TypeScript + Tailwind CSS 3 (PostCSS) + shadcn/ui (Radix primitives)
- **Backend:** Express 5 + TypeScript + Passport (local strategy) + Helmet
- **Database:** PostgreSQL + Drizzle ORM + connect-pg-simple sessions
- **AI:** Anthropic Claude (claude-opus-4-6 for complex tasks, claude-sonnet-4-5 for simple/fallback) via `server/system-wrapper/api-gateway.ts` (3 retries, 30s timeout, PII redaction)
- **Email:** Resend API for sending + inbound webhooks (Svix verification)
- **Client routing:** Wouter (lightweight). **State:** TanStack Query for server state, `useAuth()` context for auth.
- **Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`

### Server Request Flow
```
server/index.ts → helmet → json(rawBody) → session → passport → routes.ts → [route modules] → vite.ts (dev) | static.ts (prod)
```

### Key Server Layers
- **`server/routes.ts`** — Route registrar that mounts 9 domain modules from `server/routes/` (email, ai, compose, folders, settings, finops, calendar, threads, security)
- **`server/routes/_shared.ts`** — Rate limiters (auth: 10/15min, API: 100/min, AI: 50/2hr), `escapeHtml`, `apiError` helper
- **`server/storage.ts`** — Database access layer (DAL) implementing `IStorage` interface for all 12 tables. Single `storage` export used everywhere.
- **`server/ai-pipeline.ts`** — Core email processing: parallel summarize + classify + spam analysis, then conditional draft reply. Capped at 50 emails/batch with `pLimit(3)`.
- **`server/system-wrapper/prompt-orchestrator.ts`** — 13 prompt templates (smart_reply, classify, spam_analysis, financial_extraction, meeting_extraction, etc.) returning `PromptResult` with model complexity hints
- **`server/system-wrapper/api-gateway.ts`** — Anthropic Claude wrapper with retry logic, 30s timeout, PII sanitization via `security.ts`, automatic fallback from claude-opus-4-6 to claude-sonnet-4-5
- **`server/system-wrapper/context-manager.ts`** — User preference cache (30-min TTL) and thread compression for AI context windows
- **`server/auth.ts`** — Passport local strategy, bcrypt hashing, deserialized user cache (60s TTL), login attempt rate limiting

### Client Layout
3-column layout: sidebar (`app-sidebar.tsx`) → email list (in `mail.tsx`) → detail panel (`email-detail.tsx` or dashboard panels). Virtual folders `finops`, `calendar`, `security` render full-width dashboard panels instead of email list.

AI features: Command bar via Cmd+K (`ai-command-bar.tsx`), chat panel (`ai-chat-panel.tsx`), morning briefing (`morning-briefing.tsx`).

Unauthenticated users see demo data via `useDemoData()` hook (lazy-loaded from `lib/demo-data.ts`).

### Database Schema (`shared/schema.ts`)
12 tables with UUID primary keys (except `email_threads.id` which is varchar for hex hash IDs):
- **Core:** `users`, `emails`, `agent_activity`, `custom_folders`
- **FinOps:** `financial_documents`
- **Calendar:** `calendar_events`, `calendar_participants`, `timezone_conflicts`, `availability_slots`
- **Security:** `quarantine_actions`, `threat_scan_logs`
- **AI:** `email_threads`, `user_preferences`, `ai_chat_history`

All insert schemas are generated via `drizzle-zod`. Foreign keys cascade on user delete.

### AI Pipeline Flow (`processEmail`)
1. Log "Aegis Gatekeeper" agent activity (pending)
2. Parallel: `summarizeEmail` + `classifyEmail` + `analyzeSpamRisk`
3. Category-specific processing: FinOps extraction for finance emails, Chrono meeting extraction for scheduling emails
4. Enhanced threat analysis + auto-quarantine for high-risk emails
5. Thread detection and digest generation
6. If inbox + suggestedAction=reply → `draftReply`
7. Save all AI metadata to email record, invalidate context cache

### Build System (`script/build.ts`)
Custom build script: Vite builds client to `dist/public/`, esbuild bundles server to `dist/index.cjs` (CJS format). Server deps on an allowlist get bundled; everything else is external. **`bcrypt` must NOT be in the esbuild allowlist** — its native `.node` binary breaks when bundled.

## Build & Schema Gotchas

- `tsx` and `esbuild` must be in `dependencies` (not devDependencies) — Render needs them at build time
- Tailwind v3 uses PostCSS — **never** add `@tailwindcss/vite` (v4 conflict)
- `drizzle-kit push` must use `--force` flag — without TTY it silently skips schema changes
- `drizzle.config.ts` has `tablesFilter: ["!session"]` — the connect-pg-simple `session` table confuses drizzle-kit
- `db:push` runs `script/fix-schema-types.ts` first — drops empty tables with wrong column types and adds missing columns before drizzle-kit runs
- Schema uses `uuid()` for all PK/FK columns — using `varchar()` causes FK type mismatches against PostgreSQL's actual uuid columns
- PostgreSQL SSL on Render: must use `ssl: { rejectUnauthorized: false }` (not `ssl: true`) — Render uses self-signed certs
- `@replit/vite-plugin-runtime-error-modal` must be wrapped in `NODE_ENV !== "production"` conditional
- `package-lock.json` must stay in sync — always run `npm install` in deploy clone before pushing
