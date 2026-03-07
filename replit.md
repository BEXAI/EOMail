# AIMAIL.com

A full-featured Gmail replica called AIMAIL.com, built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM — enhanced with AI-powered autonomous email assistance.

## Architecture

- **Frontend**: React + Vite, TanStack Query, Wouter routing, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database (Drizzle ORM)
- **Auth**: Passport.js local strategy, express-session with connect-pg-simple, bcrypt password hashing
- **AI**: OpenAI integration via Replit AI Integrations blueprint (gpt-5-mini)
- **Shared**: Drizzle schema types in `shared/schema.ts`

## Database

- **PostgreSQL** via Replit's built-in database (DATABASE_URL)
- **Tables**: `users` (UUID PK), `emails` (UUID PK, FK to users, AI fields), `agent_activity` (UUID PK), `session` (connect-pg-simple)
- **ORM**: Drizzle ORM with `drizzle-kit push` for schema sync
- **Indexes**: emails.userId, emails.folder, emails.(userId+folder), emails.timestamp

## Authentication

- UUID-based user IDs generated server-side via `gen_random_uuid()`
- Passport LocalStrategy with bcrypt password hashing
- Session stored in PostgreSQL via connect-pg-simple
- Auth routes: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/user
- All email routes protected with requireAuth middleware
- Each user's emails are scoped by userId — full multi-user isolation
- New users get 12 realistic seed emails on registration (auto AI-processed)

## Key Features

### Gmail Core
- Inbox, Starred, Sent, Drafts, Spam, Trash, All Mail folders
- Email list with unread/read states, star, delete, archive, move-to actions
- Mark as read/unread toggle
- Bulk actions: select all, bulk delete, mark read/unread, star, archive
- Email detail view with HTML body rendering
- Compose dialog with To, CC, BCC, Subject, Body fields
- Reply functionality with pre-filled fields
- Undo Send — 5 second delay with undo toast button
- Move to folder dropdown (Inbox, Archive, Spam, Trash)
- Archive action (moves to All Mail)
- Label filtering — click sidebar labels to filter by label
- Search across emails with keyword highlighting
- Dark/light mode toggle with localStorage persistence
- Keyboard shortcuts: c=compose, r=reply, s=star, e=archive, #=delete, j/k=navigate, /=search, Esc=close, Cmd+K=AI command
- Responsive mobile layout (single-column on small screens, back button)
- Signup / Login / Logout with session persistence

### AI Features
- **Morning Briefing Dashboard**: Personalized greeting with stats (unread, AI-processed, pending approvals), AI-generated briefing summary, top urgent emails, "Process All with AI" button
- **AI Command Bar (Cmd+K)**: Natural language queries about inbox, quick command suggestions, inline AI response display
- **Email Classification & Summarization**: AI categorizes emails (finance/scheduling/newsletter/action-required/social/notification), assigns urgency (low/medium/high), suggests actions
- **AI Draft Replies**: Automatic reply drafting for action-required emails
- **Pending Approvals Workflow**: Virtual folder showing emails with AI-drafted replies, Approve & Send / Edit / Reject buttons
- **Active Agents Sidebar**: Live agent activity feed with status indicators (pending/complete/error), auto-refresh while tasks are active
- **Gatekeeper Spam Analysis**: AI spam risk scoring (0-100), red warning banner for high-risk emails with Trust/Report actions
- **AI Insights Panel**: Per-email AI summary, urgency badge, category badge, suggested action chip in detail view

## File Structure

- `client/src/pages/auth.tsx` - Login/signup page with tabs
- `client/src/pages/mail.tsx` - Main mail page with all state management
- `client/src/hooks/use-auth.tsx` - Auth context provider with login/register/logout mutations
- `client/src/components/app-sidebar.tsx` - Left sidebar with folders, label filtering, Active Agents, user info
- `client/src/components/email-list.tsx` - Email list with AI urgency dots, category badges, AI summaries
- `client/src/components/email-detail.tsx` - Email reading pane with AI Insights, Gatekeeper warnings, Pending Approval cards
- `client/src/components/compose-dialog.tsx` - Compose/reply dialog with CC/BCC fields and prefill support
- `client/src/components/morning-briefing.tsx` - Morning Briefing dashboard component
- `client/src/components/ai-command-bar.tsx` - AI Command Bar dialog (Cmd+K)
- `server/index.ts` - Express server setup, auth middleware wiring
- `server/auth.ts` - Passport config, session setup, auth routes (register/login/logout)
- `server/routes.ts` - API routes with requireAuth, userId scoping, AI endpoints
- `server/storage.ts` - DatabaseStorage class using Drizzle ORM queries
- `server/db.ts` - PostgreSQL connection pool and Drizzle instance
- `server/ai.ts` - AI service functions (summarize, classify, draft, briefing, spam analysis, command)
- `server/ai-pipeline.ts` - AI processing pipeline (single email + batch processing)
- `shared/schema.ts` - Drizzle schema: users, emails (with AI fields), agent_activity tables
- `shared/models/chat.ts` - Chat message types

## API Routes

### Auth
- `POST /api/auth/register` — Create user (UUID), hash password, seed emails, auto-login
- `POST /api/auth/login` — Authenticate with username/password
- `POST /api/auth/logout` — Destroy session
- `GET /api/auth/user` — Return current user or 401

### Emails
- `GET /api/emails?folder=inbox&search=query&label=work` — List emails (auth required, scoped by userId)
- `GET /api/emails/counts` — Unread/total counts per folder
- `GET /api/emails/:id` — Single email
- `POST /api/emails` — Create email (userId injected server-side)
- `PATCH /api/emails/:id` — Update email (read, star, folder)
- `POST /api/emails/bulk` — Bulk update or delete { ids, action, updates }
- `DELETE /api/emails/:id` — Delete email

### AI
- `POST /api/ai/process/:id` — Process single email with AI (classify, summarize, draft, spam check)
- `POST /api/ai/process-all` — Batch process all unprocessed emails
- `GET /api/ai/briefing` — Generate morning briefing from recent emails
- `GET /api/ai/activity` — Get recent agent activity log
- `POST /api/ai/command` — Natural language command (takes `prompt` in body)
- `POST /api/ai/approve/:id` — Approve AI draft reply (sends as email)
- `POST /api/ai/reject/:id` — Reject AI draft reply (clears draft)
