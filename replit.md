# AIMAIL.com

A full-featured Gmail replica called AIMAIL.com, built with React, TypeScript, Express, and in-memory storage.

## Architecture

- **Frontend**: React + Vite, TanStack Query, Wouter routing, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with in-memory storage (MemStorage)
- **Shared**: Drizzle schema types in `shared/schema.ts`

## Key Features

- Inbox, Starred, Sent, Drafts, Spam, Trash, All Mail folders
- Email list with unread/read states, star, delete, archive, move-to actions
- Mark as read/unread toggle (button in list hover + detail toolbar + dropdown menu)
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
- Compose state reset when opening fresh compose
- Attachment indicators
- Email counts per folder
- Realistic seed data on startup

## File Structure

- `client/src/pages/mail.tsx` - Main mail page with all state management, keyboard shortcuts, undo send
- `client/src/components/app-sidebar.tsx` - Left sidebar with folders, label filtering, compose button
- `client/src/components/email-list.tsx` - Email list with hover actions, bulk actions bar, select all
- `client/src/components/email-detail.tsx` - Email reading pane with mark read, archive, move-to
- `client/src/components/compose-dialog.tsx` - Compose/reply dialog with CC/BCC fields
- `server/routes.ts` - API routes including bulk operations
- `server/storage.ts` - In-memory storage with seed data, bulk update/delete methods
- `shared/schema.ts` - Email and User types

## API Routes

- `GET /api/emails?folder=inbox&search=query&label=work` - List emails (supports label filter)
- `GET /api/emails/counts` - Unread/total counts per folder
- `GET /api/emails/:id` - Single email
- `POST /api/emails` - Create email (send)
- `PATCH /api/emails/:id` - Update email (read, star, folder)
- `POST /api/emails/bulk` - Bulk update or delete { ids, action, updates }
- `DELETE /api/emails/:id` - Delete email
