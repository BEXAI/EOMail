-- Standard PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "avatar_initials" TEXT NOT NULL,
  "mailbox_address" TEXT,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "verification_token" TEXT,
  "reset_token" TEXT,
  "reset_token_expiry" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "users_reset_token_idx" ON "users" ("reset_token");
CREATE INDEX IF NOT EXISTS "users_verification_token_idx" ON "users" ("verification_token");
CREATE INDEX IF NOT EXISTS "users_mailbox_address_idx" ON "users" ("mailbox_address");

-- Emails Table
CREATE TABLE IF NOT EXISTS "emails" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "from" TEXT NOT NULL,
  "from_email" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "to_email" TEXT NOT NULL,
  "cc" TEXT DEFAULT '',
  "bcc" TEXT DEFAULT '',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "preview" TEXT NOT NULL,
  "timestamp" TIMESTAMP NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "starred" BOOLEAN NOT NULL DEFAULT false,
  "folder" TEXT NOT NULL DEFAULT 'inbox',
  "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "attachments" INTEGER NOT NULL DEFAULT 0,
  "ai_summary" TEXT,
  "ai_category" TEXT,
  "ai_urgency" TEXT,
  "ai_suggested_action" TEXT,
  "ai_draft_reply" TEXT,
  "ai_spam_score" INTEGER,
  "ai_spam_reason" TEXT,
  "ai_processed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "emails_user_id_idx" ON "emails" ("user_id");
CREATE INDEX IF NOT EXISTS "emails_folder_idx" ON "emails" ("folder");
CREATE INDEX IF NOT EXISTS "emails_user_folder_idx" ON "emails" ("user_id", "folder");
CREATE INDEX IF NOT EXISTS "emails_timestamp_idx" ON "emails" ("timestamp");
CREATE INDEX IF NOT EXISTS "emails_user_ai_processed_idx" ON "emails" ("user_id", "ai_processed");
CREATE INDEX IF NOT EXISTS "emails_user_starred_idx" ON "emails" ("user_id", "starred");

-- Agent Activity Table
CREATE TABLE IF NOT EXISTS "agent_activity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agent_name" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "email_id" UUID,
  "detail" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "agent_activity_user_idx" ON "agent_activity" ("user_id");

-- Custom Folders Table
CREATE TABLE IF NOT EXISTS "custom_folders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "parent_id" UUID,
  "icon" TEXT DEFAULT 'folder',
  "color" TEXT DEFAULT 'blue',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "custom_folders_user_idx" ON "custom_folders" ("user_id");
CREATE INDEX IF NOT EXISTS "custom_folders_parent_idx" ON "custom_folders" ("parent_id");

-- AI Chat History Table
CREATE TABLE IF NOT EXISTS "ai_chat_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email_id" UUID REFERENCES "emails"("id") ON DELETE SET NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ai_chat_history_user_idx" ON "ai_chat_history" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_chat_history_email_idx" ON "ai_chat_history" ("email_id");
CREATE INDEX IF NOT EXISTS "ai_chat_history_created_at_idx" ON "ai_chat_history" ("created_at");

-- Session Table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" TEXT PRIMARY KEY,
  "sess" TEXT NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
