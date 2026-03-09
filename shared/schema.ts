import { pgTable, text, varchar, boolean, timestamp, integer, index, jsonb, numeric } from "drizzle-orm/pg-core";
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
  mailboxAddress: text("mailbox_address"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  timezone: text("timezone").default("America/New_York"),
  workingHoursStart: text("working_hours_start").default("09:00"),
  workingHoursEnd: text("working_hours_end").default("17:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_reset_token_idx").on(table.resetToken),
  index("users_verification_token_idx").on(table.verificationToken),
  index("users_mailbox_address_idx").on(table.mailboxAddress),
]);

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
  threadId: varchar("thread_id"),
  threadSubject: text("thread_subject"),
  threadPosition: integer("thread_position"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("emails_user_id_idx").on(table.userId),
  index("emails_folder_idx").on(table.folder),
  index("emails_user_folder_idx").on(table.userId, table.folder),
  index("emails_timestamp_idx").on(table.timestamp),
  index("emails_user_ai_processed_idx").on(table.userId, table.aiProcessed),
  index("emails_user_starred_idx").on(table.userId, table.starred),
  index("emails_thread_id_idx").on(table.threadId),
  index("emails_user_thread_idx").on(table.userId, table.threadId, table.timestamp),
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

export const customFolders = pgTable("custom_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentId: varchar("parent_id"),
  icon: text("icon").default("folder"),
  color: text("color").default("blue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("custom_folders_user_idx").on(table.userId),
  index("custom_folders_parent_idx").on(table.parentId),
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

export type EmailFolder = "inbox" | "starred" | "sent" | "drafts" | "archive" | "spam" | "trash" | "quarantine" | "all";

// ─── FinOps Autopilot ───────────────────────────────────────────────────────

export const financialDocuments = pgTable("financial_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailId: varchar("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull().default("invoice"),
  status: text("status").notNull().default("extracted"),
  vendorName: text("vendor_name"),
  vendorEmail: text("vendor_email"),
  invoiceNumber: text("invoice_number"),
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  currency: text("currency").default("USD"),
  subtotal: numeric("subtotal"),
  tax: numeric("tax"),
  shipping: numeric("shipping"),
  discount: numeric("discount"),
  total: numeric("total"),
  lineItems: jsonb("line_items"),
  paymentStatus: text("payment_status"),
  confidenceScore: integer("confidence_score"),
  rawExtraction: jsonb("raw_extraction"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("fin_docs_user_idx").on(table.userId),
  index("fin_docs_email_idx").on(table.emailId),
  index("fin_docs_status_idx").on(table.userId, table.status),
  index("fin_docs_vendor_idx").on(table.userId, table.vendorName),
]);

export const insertFinancialDocumentSchema = createInsertSchema(financialDocuments).omit({ id: true, createdAt: true });
export type InsertFinancialDocument = z.infer<typeof insertFinancialDocumentSchema>;
export type FinancialDocument = typeof financialDocuments.$inferSelect;

// ─── Chrono Logistics ───────────────────────────────────────────────────────

export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailId: varchar("email_id").references(() => emails.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  location: text("location"),
  meetingUrl: text("meeting_url"),
  status: text("status").notNull().default("pending"),
  organizerEmail: text("organizer_email"),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("cal_events_user_idx").on(table.userId),
  index("cal_events_time_idx").on(table.userId, table.startTime),
  index("cal_events_email_idx").on(table.emailId),
]);

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

export const calendarParticipants = pgTable("calendar_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => calendarEvents.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  status: text("status").notNull().default("pending"),
  isOptional: boolean("is_optional").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cal_participants_event_idx").on(table.eventId),
]);

export const insertCalendarParticipantSchema = createInsertSchema(calendarParticipants).omit({ id: true, createdAt: true });
export type InsertCalendarParticipant = z.infer<typeof insertCalendarParticipantSchema>;
export type CalendarParticipant = typeof calendarParticipants.$inferSelect;

export const timezoneConflicts = pgTable("timezone_conflicts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => calendarEvents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conflictType: text("conflict_type").notNull(),
  severity: text("severity").notNull().default("medium"),
  details: text("details"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tz_conflicts_event_idx").on(table.eventId),
  index("tz_conflicts_user_idx").on(table.userId),
]);

export const insertTimezoneConflictSchema = createInsertSchema(timezoneConflicts).omit({ id: true, createdAt: true });
export type InsertTimezoneConflict = z.infer<typeof insertTimezoneConflictSchema>;
export type TimezoneConflict = typeof timezoneConflicts.$inferSelect;

export const availabilitySlots = pgTable("availability_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  isAvailable: boolean("is_available").notNull().default(true),
  priority: integer("priority").notNull().default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("avail_slots_user_idx").on(table.userId),
]);

export const insertAvailabilitySlotSchema = createInsertSchema(availabilitySlots).omit({ id: true, createdAt: true });
export type InsertAvailabilitySlot = z.infer<typeof insertAvailabilitySlotSchema>;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;

// ─── Aegis Security ─────────────────────────────────────────────────────────

export const quarantineActions = pgTable("quarantine_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailId: varchar("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  threatScore: integer("threat_score").notNull(),
  threatType: text("threat_type").notNull(),
  quarantineReason: text("quarantine_reason"),
  detectedUrls: text("detected_urls").array(),
  neutralizedUrls: text("neutralized_urls").array(),
  domainAnalysis: jsonb("domain_analysis"),
  autoQuarantined: boolean("auto_quarantined").notNull().default(true),
  releaseStatus: text("release_status").default("quarantined"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("quarantine_user_idx").on(table.userId),
  index("quarantine_email_idx").on(table.emailId),
  index("quarantine_status_idx").on(table.userId, table.releaseStatus),
]);

export const insertQuarantineActionSchema = createInsertSchema(quarantineActions).omit({ id: true, createdAt: true });
export type InsertQuarantineAction = z.infer<typeof insertQuarantineActionSchema>;
export type QuarantineAction = typeof quarantineActions.$inferSelect;

export const threatScanLogs = pgTable("threat_scan_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailId: varchar("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  scanType: text("scan_type").notNull().default("inbound"),
  threatLevel: text("threat_level").notNull(),
  scanDuration: integer("scan_duration"),
  detections: jsonb("detections"),
  aiModelVersion: text("ai_model_version"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("scan_logs_email_idx").on(table.emailId),
  index("scan_logs_user_idx").on(table.userId),
]);

export const insertThreatScanLogSchema = createInsertSchema(threatScanLogs).omit({ id: true, createdAt: true });
export type InsertThreatScanLog = z.infer<typeof insertThreatScanLogSchema>;
export type ThreatScanLog = typeof threatScanLogs.$inferSelect;

// ─── EOMail Assistant (Threads) ─────────────────────────────────────────────

export const emailThreads = pgTable("email_threads", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  participants: text("participants").array().notNull().default(sql`ARRAY[]::text[]`),
  messageCount: integer("message_count").notNull().default(0),
  firstMessageDate: timestamp("first_message_date").notNull(),
  lastMessageDate: timestamp("last_message_date").notNull(),
  digest: text("digest"),
  keyPoints: text("key_points").array(),
  aiProcessed: boolean("ai_processed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("threads_user_idx").on(table.userId),
  index("threads_last_msg_idx").on(table.userId, table.lastMessageDate),
]);

export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({ createdAt: true, updatedAt: true });
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;
export type EmailThread = typeof emailThreads.$inferSelect;

