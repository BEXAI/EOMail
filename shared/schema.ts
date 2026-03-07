import { pgTable, text, varchar, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  from: text("from").notNull(),
  fromEmail: text("from_email").notNull(),
  to: text("to").notNull(),
  toEmail: text("to_email").notNull(),
  cc: text("cc").default(""),
  bcc: text("bcc").default(""),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  preview: text("preview").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  starred: boolean("starred").notNull().default(false),
  folder: text("folder").notNull().default("inbox"),
  labels: text("labels").array().notNull().default(sql`ARRAY[]::text[]`),
  attachments: integer("attachments").notNull().default(0),
  aiSummary: text("ai_summary"),
  aiCategory: text("ai_category"),
  aiUrgency: text("ai_urgency"),
  aiSuggestedAction: text("ai_suggested_action"),
  aiDraftReply: text("ai_draft_reply"),
  aiSpamScore: integer("ai_spam_score"),
  aiSpamReason: text("ai_spam_reason"),
  aiProcessed: boolean("ai_processed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("emails_user_id_idx").on(table.userId),
  index("emails_folder_idx").on(table.folder),
  index("emails_user_folder_idx").on(table.userId, table.folder),
  index("emails_timestamp_idx").on(table.timestamp),
]);

export const agentActivity = pgTable("agent_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentName: text("agent_name"),
  action: text("action").notNull(),
  status: text("status").notNull().default("pending"),
  emailId: varchar("email_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("agent_activity_user_idx").on(table.userId),
]);

export const insertEmailSchema = createInsertSchema(emails).omit({ id: true, createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertAgentActivitySchema = createInsertSchema(agentActivity).omit({ id: true, createdAt: true });
export type InsertAgentActivity = z.infer<typeof insertAgentActivitySchema>;
export type AgentActivity = typeof agentActivity.$inferSelect;

export type EmailFolder = "inbox" | "starred" | "sent" | "drafts" | "spam" | "trash" | "all";

export * from "./models/chat";
