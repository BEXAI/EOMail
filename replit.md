# EOMail.co

A full-featured Gmail replica transformed into an AI-powered autonomous email assistant. Built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM.

**Mission**: Shift users from "Inbox Zero" to "Zero Time Spent" — the inbox becomes an autonomous, action-oriented Chief of Staff.

## Architecture

- **Frontend**: React + Vite, TanStack Query, Wouter routing, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database (Drizzle ORM)
- **Auth**: Passport.js local strategy, express-session with connect-pg-simple, bcrypt password hashing
- **AI**: System Wrapper v2 — Context Manager → Prompt Orchestrator → API Gateway (gpt-4o-mini for simple tasks, gpt-4o for complex, with fallback chaining) → Security Layer (PII redaction)
- **Email**: Resend SDK for outbound email delivery and inbound webhook processing
- **Shared**: Drizzle schema types in `shared/schema.ts`

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (Replit built-in)
- `SESSION_SECRET` — Required. App refuses to start without it
- `OPENAI_API_KEY` — OpenAI API key for AI features
- `RESEND_API_KEY` — Resend API key for email sending
- `DOMAIN` — Email domain (default: eomail.co)

## Database

- **PostgreSQL** via Replit's built-in database (DATABASE_URL)
- **Tables**: `users` (UUID PK, mailboxAddress, emailVerified, verificationToken, resetToken, resetTokenExpiry), `emails` (UUID PK, FK to users, AI fields), `agent_activity` (UUID PK, agent names), `session` (connect-pg-simple)
- **ORM**: Drizzle ORM with `drizzle-kit push` for schema sync
- **Indexes**: emails.userId, emails.folder, emails.(userId+folder), emails.timestamp

## Named AI Agents

Three specialized autonomous agents from the EOMail product blueprint:

1. **FinOps Auto-Resolver** (Level 4 Autonomy) — Intercepts financial emails (receipts, invoices, subscriptions), extracts amounts, auto-categorizes as finance. Shows Liquid UI finance card with extracted amounts and "Log to Accounting" action.

2. **Chrono-Logistics Coordinator** (Level 4 Autonomy) — Detects scheduling/meeting emails, identifies dates and times, offers calendar integration. Shows Liquid UI scheduling card with "Accept & Add to Calendar" action.

3. **Aegis Gatekeeper** (Level 5 Autonomy) — Scans all emails for spam, phishing, impersonation, and deepfake risks. Shows impersonation probability percentage, threat type classification, and collapsible technical analysis for high-risk emails.

Each agent activity is logged with agent name, displayed in sidebar with distinct icon and color.

## Key Features

### Gmail Core
- Inbox, Starred, Sent, Drafts, Archive, Spam, Trash, All Mail, Pending Approvals folders
- Draft saving: auto-save on compose close, manual "Save Draft" button, resume/edit drafts from Drafts folder, PATCH existing draft, DELETE draft on send
- Archive folder: dedicated folder separate from All Mail; archiving moves emails to `folder: "archive"`
- Email list with unread/read states, star, delete, archive, move-to actions
- Bulk actions: select all, bulk delete, mark read/unread, star, archive
- Email detail view with HTML body rendering (DOMPurify XSS protection)
- Compose dialog with To, CC, BCC, Subject, Body, prefill support
- Reply functionality with pre-filled fields
- Undo Send — 5 second delay with undo toast button
- Search with keyword highlighting
- Dark/light mode toggle
- Keyboard shortcuts: c=compose, r=reply, s=star, e=archive, #=delete, j/k=navigate, /=search, Esc=close, Cmd+K=AI Action Center
- Responsive mobile layout

### AI Features
- **Morning Briefing Dashboard**: "Chief of Staff" briefing with personalized greeting, stats cards, agent activity summary (per-agent task counts with icons), urgent emails list, "Process All with AI" button
- **AI Action Center (Cmd+K)**: Agent-grouped command suggestions (FinOps, Chrono, Aegis, EOMail), command history (localStorage), inline AI response
- **Smart Folders & Auto-Organization**: AI-powered "Automate Emails Into Folders" button that:
  - Classifies each inbox email using GPT-4o-mini (finance, scheduling, newsletter, action-required, social, notification)
  - Creates category-named folders (Finance, Scheduling, Newsletters, Action Required, Social, Notifications)
  - Copies emails into their category folder while keeping originals in Inbox
  - Displays folders in sidebar with category-specific icons and colors, nested expand/collapse support
  - Custom folders stored in `custom_folders` DB table with parent/child hierarchy
  - Emails in custom folders use `folder: "custom:FolderName"` convention
  - Deduplication: repeated auto-organize runs skip emails already copied (keyed on subject+fromEmail+timestamp)
  - "All Mail" view excludes `custom:` folder copies to prevent duplicate display
- **Liquid UI**: Category-specific interactive micro-app cards in email detail:
  - Finance: extracted amounts, "Log to Accounting", "Auto-Archive"
  - Scheduling: meeting detection, "Accept & Add to Calendar", "Suggest Alternatives"
  - Newsletter: condensed summary, "Archive", "Unsubscribe"
  - Action-Required: priority indicator, quick reply/flag actions
- **Tone Micro-Prompts**: Draft reply editing with one-click tone chips ("More assertive", "More casual", "Shorter", "More formal", "Add gratitude")
- **Enhanced Gatekeeper**: Impersonation probability percentage, threat type badges (phishing/impersonation/urgency-manipulation/spam), collapsible technical analysis
- **AI Chat Panel**: Persistent bottom-of-screen (1/3 height) chat interface with:
  - Transparent dark glass morphism background (backdrop-blur)
  - Multi-turn conversation with full inbox context (20 most recent emails)
  - Quick action buttons: Scan threats, Financial summary, Schedule overview, Inbox briefing
  - Chief of Staff persona — decisive, action-oriented, references agents by name
  - Markdown rendering (bold, italic, code, lists)
  - Collapsible/expandable, closeable from header bar
  - Toggle via Bot icon button in header (data-testid: button-ai-chat-toggle)
- **Pending Approvals Workflow**: Virtual folder, AI draft replies with Approve & Send / Edit / Reject
- **Active Agents Sidebar**: Named agents with distinct icons/colors, real-time status, auto-refresh

### Email Infrastructure
- **Outbound**: Resend SDK sends real emails when composing (folder=sent) or approving AI drafts
- **Inbound**: POST /api/email/inbound webhook receives emails from Resend, maps to user by mailbox address, inserts into inbox, triggers AI triage
- **Mailbox Provisioning**: Each user gets username@eomail.co address on registration
- **Password Reset**: Forgot password flow via email with time-limited token (1 hour)
- **Email Verification**: Verification email on registration with token-based confirmation

## File Structure

- `client/src/pages/auth.tsx` - Login/signup with EOMail branding, forgot password link
- `client/src/pages/forgot-password.tsx` - Forgot password form (sends reset email)
- `client/src/pages/reset-password.tsx` - Reset password form (validates token)
- `client/src/pages/verify-email.tsx` - Email verification page (auto-verifies on load)
- `client/src/pages/mail.tsx` - Main mail page with all state management
- `client/src/hooks/use-auth.tsx` - Auth context provider (includes mailboxAddress, emailVerified)
- `client/src/components/app-sidebar.tsx` - Sidebar with folders, labels, named Active Agents, mailbox address display
- `client/src/components/email-list.tsx` - Email list with AI urgency dots, category badges
- `client/src/components/email-detail.tsx` - Email detail with AI Insights, Liquid UI cards, enhanced Gatekeeper, tone micro-prompts, DOMPurify sanitization
- `client/src/components/compose-dialog.tsx` - Compose/reply dialog with prefill, draft save/resume support
- `client/src/components/theme-toggle.tsx` - Dark/light mode toggle component
- `client/src/components/morning-briefing.tsx` - Chief of Staff briefing dashboard with agent stats
- `client/src/components/ai-command-bar.tsx` - Agent-grouped AI Action Center (Cmd+K)
- `client/src/components/ai-chat-panel.tsx` - Persistent AI chat panel (bottom 1/3, glass morphism, multi-turn)
- `server/ai.ts` - AI service layer (System Wrapper v2) — routes all LLM calls through Context Manager → Prompt Orchestrator → API Gateway → Security Layer
- `server/ai-context.ts` - Per-user email context index cache (TTL 5min, max 20 emails, invalidated on mutations)
- `server/ai-pipeline.ts` - AI processing pipeline with named agent assignments, accepts preloaded emails to avoid redundant fetches
- `server/system-wrapper/security.ts` - PII redaction (credit cards, SSN, passwords, API keys, bank accounts) before API calls
- `server/system-wrapper/context-manager.ts` - Thread compression (rolling window), metadata injection, user preference store (tone, signature, formality)
- `server/system-wrapper/prompt-orchestrator.ts` - Task-specific prompt templates with complexity routing (simple→gpt-4o-mini, complex→gpt-4o)
- `server/system-wrapper/api-gateway.ts` - Model routing, exponential backoff retry (3x), fallback chaining (gpt-4o→gpt-4o-mini), 15s timeout, PII sanitization
- `server/email.ts` - Resend SDK email service (send, password reset, verification emails)
- `server/routes.ts` - API routes including AI endpoints, inbound webhook
- `server/storage.ts` - DatabaseStorage with user lookup methods (by email, reset token, verification token, mailbox)
- `shared/schema.ts` - Drizzle schema with AI fields, agentName column, user auth fields

## API Routes

### Auth
- `POST /api/auth/register` — Create user with mailbox address, send verification email, auto-login
- `POST /api/auth/login` — Authenticate
- `POST /api/auth/logout` — Destroy session
- `GET /api/auth/user` — Current user or 401
- `POST /api/auth/forgot-password` — Send password reset email
- `POST /api/auth/reset-password` — Validate token and set new password
- `POST /api/auth/verify-email` — Verify email with token
- `POST /api/auth/resend-verification` — Resend verification email

### Emails
- `GET /api/emails?folder=inbox&search=query&label=work` — List emails
- `GET /api/emails/counts` — Folder counts
- `GET /api/emails/:id` — Single email
- `POST /api/emails` — Create email (sends via Resend when folder=sent)
- `PATCH /api/emails/:id` — Update email
- `POST /api/emails/bulk` — Bulk operations
- `DELETE /api/emails/:id` — Delete email

### AI
- `POST /api/ai/process/:id` — Process single email (classify, summarize, draft, spam)
- `POST /api/ai/process-all` — Batch process unprocessed emails
- `POST /api/ai/draft-reply/:id` — Generate/regenerate draft with optional `tone` param
- `GET /api/ai/briefing` — Morning briefing with agent stats
- `GET /api/ai/activity` — Agent activity log (includes agent names)
- `POST /api/ai/command` — Natural language command
- `POST /api/ai/approve/:id` — Approve and send AI draft (sends via Resend)
- `POST /api/ai/reject/:id` — Reject AI draft
- `POST /api/ai/chat` — Multi-turn AI chat with full inbox context (messages array, max 50 turns, 2000 char limit per message)
- `POST /api/ai/auto-organize` — AI-powered auto-organize: classifies inbox emails and copies them into category folders
- `POST /api/ai/expand-draft` — Expand shorthand notes into full professional email (notes, recipientName, recipientCompany?, relationship?)

### User Preferences
- `GET /api/user/preferences` — Get AI behavior preferences (tone, signature, formality, jargon toggle)
- `POST /api/user/preferences` — Update AI behavior preferences

### Custom Folders
- `GET /api/folders` — List user's custom folders
- `POST /api/folders` — Create custom folder (name, parentId, icon, color)
- `DELETE /api/folders/:id` — Delete custom folder

### Inbound
- `POST /api/email/inbound` — Webhook for incoming emails (no auth, maps to user by mailbox)

## Security & Production Hardening

- **Helmet**: Security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.) via `helmet` middleware
- **Rate Limiting**: `express-rate-limit` — auth: 10 req/15min, API: 100 req/min, AI: 50 req/hr per IP
- **Input Validation**: Zod schemas for PATCH email updates (strict mode), bulk actions (max 500 ids), AI command prompt (max 500 chars)
- **XSS Protection**: DOMPurify sanitization on all rendered email HTML bodies
- **Session Security**: SESSION_SECRET required at startup (no fallback)
- **Error Handling**: All frontend mutations have `onError` callbacks with user-facing toast notifications
- **Token Security**: Password reset tokens expire after 1 hour; verification/reset tokens stripped from API responses
- **Deployment**: Autoscale target, `npm run build` → `node dist/index.cjs`

## UX Polish

- **Accessibility**: Email list items have `role="option"`, `tabIndex={0}`, focus-visible rings; compose dialog has `role="dialog"`, `aria-modal="true"`, `aria-label` on icon buttons; morning briefing urgent cards are keyboard navigable
- **Mobile**: Email list checkboxes/stars always visible on mobile via `useIsMobile()` hook; compose dialog shows mobile backdrop overlay; hover-only quick actions hidden on touch devices
- **Animations**: Bulk actions bar slides in; compose dialog slides up; CC/BCC fields animate in; quick action buttons fade in from right
- **Focus management**: Auto-focus on login/register first inputs; compose dialog focuses To field (or body for replies); global `focus-visible` ring style
- **Scrollbars**: Thin, subtle custom scrollbars on email list, email detail, and morning briefing
- **Layout**: Liquid UI cards appear above email body (not below) for better visibility
- **Interactions**: Star/archive/delete buttons have `active:scale-95` press feedback
