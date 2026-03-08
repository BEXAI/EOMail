import { pgTable, text, varchar, boolean, timestamp, integer, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  mailboxAddress: text("mailbox_address"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_reset_token_idx").on(table.resetToken),
  index("users_verification_token_idx").on(table.verificationToken),
  index("users_mailbox_address_idx").on(table.mailboxAddress),
]);

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  index("emails_user_ai_processed_idx").on(table.userId, table.aiProcessed),
  index("emails_user_starred_idx").on(table.userId, table.starred),
]);

export const agentActivity = pgTable("agent_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentName: text("agent_name"),
  action: text("action").notNull(),
  status: text("status").notNull().default("pending"),
  emailId: uuid("email_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("agent_activity_user_idx").on(table.userId),
]);

export const customFolders = pgTable("custom_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: uuid("parent_id"),
  icon: text("icon").default("folder"),
  color: text("color").default("blue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("custom_folders_user_idx").on(table.userId),
  index("custom_folders_parent_idx").on(table.parentId),
]);

export const aiChatHistory = pgTable("ai_chat_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailId: uuid("email_id").references(() => emails.id, { onDelete: "set null" }), // Optional context
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ai_chat_history_user_idx").on(table.userId),
  index("ai_chat_history_email_idx").on(table.emailId),
  index("ai_chat_history_created_at_idx").on(table.createdAt),
]);

export const insertCustomFolderSchema = createInsertSchema(customFolders).omit({ id: true, createdAt: true });
export type InsertCustomFolder = z.infer<typeof insertCustomFolderSchema>;
export type CustomFolder = typeof customFolders.$inferSelect;

export const insertEmailSchema = createInsertSchema(emails).omit({ id: true, createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertAgentActivitySchema = createInsertSchema(agentActivity).omit({ id: true, createdAt: true });
export type InsertAgentActivity = z.infer<typeof insertAgentActivitySchema>;
export type AgentActivity = typeof agentActivity.$inferSelect;

export const insertAiChatHistorySchema = createInsertSchema(aiChatHistory).omit({ id: true, createdAt: true });
export type InsertAiChatHistory = z.infer<typeof insertAiChatHistorySchema>;
export type AiChatHistory = typeof aiChatHistory.$inferSelect;

export type EmailFolder = "inbox" | "starred" | "sent" | "drafts" | "archive" | "spam" | "trash" | "all";

