# AIMAIL.com

A full-featured Gmail replica called AIMAIL.com, built with React, TypeScript, Express, and in-memory storage.

## Architecture

- **Frontend**: React + Vite, TanStack Query, Wouter routing, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with in-memory storage (MemStorage)
- **Shared**: Drizzle schema types in `shared/schema.ts`

## Key Features

- Inbox, Starred, Sent, Drafts, Spam, Trash folders
- Email list with unread/read states, star, delete actions
- Email detail view with HTML body rendering
- Compose dialog with To, Subject, Body fields
- Reply functionality
- Search across emails
- Dark/light mode toggle
- Labels system
- Attachment indicators
- Email counts per folder
- Realistic seed data on startup

## File Structure

- `client/src/pages/mail.tsx` - Main mail page with all state management
- `client/src/components/app-sidebar.tsx` - Left sidebar with folders, labels, compose button
- `client/src/components/email-list.tsx` - Email list with hover actions
- `client/src/components/email-detail.tsx` - Email reading pane
- `client/src/components/compose-dialog.tsx` - Compose/reply email dialog
- `server/routes.ts` - API routes: GET/POST/PATCH/DELETE /api/emails
- `server/storage.ts` - In-memory storage with seed data
- `shared/schema.ts` - Email and User types

## API Routes

- `GET /api/emails?folder=inbox&search=query` - List emails
- `GET /api/emails/counts` - Unread/total counts per folder
- `GET /api/emails/:id` - Single email
- `POST /api/emails` - Create email (send)
- `PATCH /api/emails/:id` - Update email (read, star, folder)
- `DELETE /api/emails/:id` - Delete email
