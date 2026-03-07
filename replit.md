# EOMail.co

## Overview
EOMail.co is an AI-powered autonomous email assistant, transforming a full-featured Gmail replica into a "Chief of Staff" for your inbox. The project's core mission is to shift users from "Inbox Zero" to "Zero Time Spent" by automating email management and making the inbox an action-oriented hub. Key capabilities include comprehensive email functionalities, advanced AI agents for financial, logistical, and security tasks, and intelligent email organization.

## User Preferences
Not specified.

## System Architecture
**Frontend**: Built with React + Vite, utilizing TanStack Query for data fetching, Wouter for routing, and styled with Tailwind CSS and Shadcn UI.
**Backend**: Implemented with Express.js, connecting to a PostgreSQL database via Drizzle ORM.
**Authentication**: Handles user authentication using Passport.js with a local strategy, `express-session` for session management with `connect-pg-simple` for PostgreSQL session storage, and `bcrypt` for password hashing.
**AI**: Features a "System Wrapper v2" acting as the core AI service layer. This includes a Context Manager, Prompt Orchestrator, and API Gateway. It employs `gpt-4o-mini` for simpler tasks and `gpt-4o` for complex ones, with fallback chaining. A Security Layer performs PII redaction.
**Email Infrastructure**: Uses Resend SDK for both outbound email delivery and processing inbound emails via webhooks.
**Shared Components**: Drizzle schema types are defined in `shared/schema.ts` for consistency between frontend and backend.

**Database**: PostgreSQL is used as the primary database. Key tables include `users`, `emails`, `agent_activity`, and `session`. Drizzle ORM manages schema synchronization.
**Named AI Agents**:
*   **FinOps Auto-Resolver**: Level 4 autonomy, processes financial emails, extracts data, and suggests accounting actions.
*   **Chrono-Logistics Coordinator**: Level 4 autonomy, detects scheduling emails, identifies dates/times, and offers calendar integration.
*   **Aegis Gatekeeper**: Level 5 autonomy, scans emails for spam, phishing, impersonation, and deepfake risks, providing threat analysis.
Agent activity is logged and displayed in the sidebar.

**Key Features**:
*   **Gmail Core**: Standard email functionalities including various folders (Inbox, Starred, Sent, Drafts, Archive, Spam, Trash, All Mail), draft saving, bulk actions, email detail view with HTML rendering (DOMPurify for XSS), compose/reply, undo send, search, dark/light mode, and keyboard shortcuts.
*   **AI Features**:
    *   **Morning Briefing Dashboard**: Provides a "Chief of Staff" briefing with personalized greetings, stats, agent activity summaries, and urgent emails.
    *   **AI Action Center (Cmd+K)**: Agent-grouped command suggestions, command history, and inline AI responses.
    *   **Smart Folders & Auto-Organization**: AI-powered classification of inbox emails into category-specific folders (e.g., Finance, Scheduling) using GPT-4o-mini. Supports custom folders with nesting.
    *   **Liquid UI**: Category-specific interactive micro-app cards embedded in email details (e.g., Finance cards for accounting, Scheduling cards for calendar actions, Newsletter summaries, Action-Required indicators).
    *   **Tone Micro-Prompts**: One-click tone adjustments for draft replies.
    *   **Enhanced Gatekeeper**: Detailed threat analysis for high-risk emails.
    *   **AI Chat Panel**: Persistent, multi-turn chat interface with full inbox context, quick action buttons, and a Chief of Staff persona.
    *   **Pending Approvals Workflow**: Virtual folder for AI-drafted replies requiring approval.
*   **Email Infrastructure**: Outbound emails sent via Resend SDK; inbound emails processed by a Resend webhook, triggering AI triage. Users receive `username@eomail.co` addresses. Includes password reset and email verification flows.
*   **Security & Production Hardening**: Utilizes Helmet for security headers, `express-rate-limit` for API throttling, Zod for input validation, DOMPurify for XSS protection, and enforces session security.
*   **UX Polish**: Features accessibility considerations (keyboard navigation, ARIA attributes), responsive mobile layout, animations, focus management, custom scrollbars, and interactive feedback.

## External Dependencies
*   **OpenAI API**: For AI features (`gpt-4o-mini`, `gpt-4o`).
*   **Resend SDK**: For outbound email delivery and inbound email webhook processing.
*   **PostgreSQL**: Database solution (via Replit's built-in `DATABASE_URL`).
*   **Drizzle ORM**: Object-relational mapper for database interaction.
*   **Passport.js**: Authentication middleware.
*   **express-session**: Session management.
*   **connect-pg-simple**: PostgreSQL session store.
*   **bcrypt**: Password hashing library.
*   **Helmet**: Security middleware for Express.
*   **express-rate-limit**: Rate limiting middleware.
*   **Zod**: Schema validation library.
*   **DOMPurify**: HTML sanitization library for XSS protection.