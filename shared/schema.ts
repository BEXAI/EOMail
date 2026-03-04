import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  avatarInitials: text("avatar_initials").notNull(),
});

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey(),
  from: text("from").notNull(),
  fromEmail: text("from_email").notNull(),
  to: text("to").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  preview: text("preview").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  starred: boolean("starred").notNull().default(false),
  folder: text("folder").notNull().default("inbox"),
  labels: text("labels").array().notNull().default([]),
  attachments: integer("attachments").notNull().default(0),
});

export const insertEmailSchema = createInsertSchema(emails).omit({ id: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type EmailFolder = "inbox" | "starred" | "sent" | "drafts" | "spam" | "trash";
