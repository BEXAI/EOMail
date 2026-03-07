# AIMAIL.com

A full-featured Gmail replica called AIMAIL.com, built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM.

## Architecture

- **Frontend**: React + Vite, TanStack Query, Wouter routing, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with PostgreSQL database (Drizzle ORM)
- **Auth**: Passport.js local strategy, express-session with connect-pg-simple, bcrypt password hashing
- **Shared**: Drizzle schema types in `shared/schema.ts`

## Database

- **PostgreSQL** via Replit's built-in database (DATABASE_URL)
- **Tables**: `users` (UUID PK), `emails` (UUID PK, FK to users), `session` (connect-pg-simple)
- **ORM**: Drizzle ORM with `drizzle-kit push` for schema sync
- **Indexes**: emails.userId, emails.folder, emails.(userId+folder), emails.timestamp

## Authentication

- UUID-based user IDs generated server-side via `gen_random_uuid()`
- Passport LocalStrategy with bcrypt password hashing
- Session stored in PostgreSQL via connect-pg-simple
- Auth routes: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/user
- All email routes protected with requireAuth middleware
- Each user's emails are scoped by userId — full multi-user isolation
- New users get 12 realistic seed emails on registration

## Key Features

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
- Keyboard shortcuts: c=compose, r=reply, s=star, e=archive, #=delete, j/k=navigate, /=search, Esc=close
- Responsive mobile layout (single-column on small screens, back button)
- Signup / Login / Logout with session persistence
- User avatar initials displayed in sidebar footer and header

## File Structure

- `client/src/pages/auth.tsx` - Login/signup page with tabs
- `client/src/pages/mail.tsx` - Main mail page with all state management
- `client/src/hooks/use-auth.tsx` - Auth context provider with login/register/logout mutations
- `client/src/components/app-sidebar.tsx` - Left sidebar with folders, label filtering, user info
- `client/src/components/email-list.tsx` - Email list with hover actions, bulk actions bar
- `client/src/components/email-detail.tsx` - Email reading pane with mark read, archive, move-to
- `client/src/components/compose-dialog.tsx` - Compose/reply dialog with CC/BCC fields
- `server/index.ts` - Express server setup, auth middleware wiring
- `server/auth.ts` - Passport config, session setup, auth routes (register/login/logout)
- `server/routes.ts` - API routes with requireAuth, userId scoping
- `server/storage.ts` - DatabaseStorage class using Drizzle ORM queries
- `server/db.ts` - PostgreSQL connection pool and Drizzle instance
- `shared/schema.ts` - Drizzle schema: users, emails tables with indexes

## API Routes

- `POST /api/auth/register` — Create user (UUID), hash password, seed emails, auto-login
- `POST /api/auth/login` — Authenticate with username/password
- `POST /api/auth/logout` — Destroy session
- `GET /api/auth/user` — Return current user or 401
- `GET /api/emails?folder=inbox&search=query&label=work` — List emails (auth required, scoped by userId)
- `GET /api/emails/counts` — Unread/total counts per folder
- `GET /api/emails/:id` — Single email
- `POST /api/emails` — Create email (userId injected server-side)
- `PATCH /api/emails/:id` — Update email (read, star, folder)
- `POST /api/emails/bulk` — Bulk update or delete { ids, action, updates }
- `DELETE /api/emails/:id` — Delete email
