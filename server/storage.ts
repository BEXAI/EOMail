import {
  type User, type InsertUser,
  type Email, type InsertEmail,
  type AgentActivity, type InsertAgentActivity,
  type CustomFolder, type InsertCustomFolder,
  type FinancialDocument, type InsertFinancialDocument,
  type CalendarEvent, type InsertCalendarEvent,
  type CalendarParticipant, type InsertCalendarParticipant,
  type TimezoneConflict, type InsertTimezoneConflict,
  type AvailabilitySlot, type InsertAvailabilitySlot,
  type QuarantineAction, type InsertQuarantineAction,
  type ThreatScanLog, type InsertThreatScanLog,
  type EmailThread, type InsertEmailThread,
  type UserPreferencesRow, type InsertUserPreferences,
  type AiChatHistory, type InsertAiChatHistory,
  users, emails, agentActivity, customFolders,
  financialDocuments, calendarEvents, calendarParticipants,
  timezoneConflicts, availabilitySlots, quarantineActions,
  threatScanLogs, emailThreads, userPreferences, aiChatHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, asc, inArray, ne, not, like, sql, isNotNull } from "drizzle-orm";

type EmailUpdates = Partial<Pick<Email, "read" | "starred" | "folder" | "labels" | "to" | "toEmail" | "cc" | "bcc" | "subject" | "body" | "preview" | "aiSummary" | "aiCategory" | "aiUrgency" | "aiSuggestedAction" | "aiDraftReply" | "aiSpamScore" | "aiSpamReason" | "aiProcessed" | "threadId" | "threadSubject" | "threadPosition">>;

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByMailbox(mailboxAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getEmails(userId: string, folder: string, search?: string, label?: string, limit?: number, offset?: number): Promise<Email[]>;
  getEmail(id: string, userId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, userId: string, updates: EmailUpdates): Promise<Email | undefined>;
  updateEmails(updates: { id: string, values: EmailUpdates }[], userId: string): Promise<Email[]>;
  deleteEmail(id: string, userId: string): Promise<boolean>;
  deleteEmails(ids: string[], userId: string): Promise<number>;
  getEmailCounts(userId: string): Promise<Record<string, number>>;
  findDuplicateEmails(userId: string, signatures: string[]): Promise<Set<string>>;
  createEmails(emails: InsertEmail[]): Promise<Email[]>;


  getUnprocessedEmails(userId: string): Promise<Email[]>;

  getAgentActivity(userId: string): Promise<AgentActivity[]>;
  createAgentActivity(data: InsertAgentActivity): Promise<AgentActivity>;
  updateAgentActivity(id: string, userId: string, updates: Partial<AgentActivity>): Promise<AgentActivity | undefined>;

  getCustomFolders(userId: string): Promise<CustomFolder[]>;
  getCustomFolder(id: string, userId: string): Promise<CustomFolder | undefined>;
  getCustomFolderByName(userId: string, name: string, parentId?: string | null): Promise<CustomFolder | undefined>;
  createCustomFolder(data: InsertCustomFolder): Promise<CustomFolder>;
  deleteCustomFolder(id: string, userId: string): Promise<boolean>;

  // FinOps
  getFinancialDocuments(userId: string, filters?: { status?: string; emailId?: string }): Promise<FinancialDocument[]>;
  getFinancialDocument(id: string, userId: string): Promise<FinancialDocument | undefined>;
  getFinancialDocumentByEmail(emailId: string, userId: string): Promise<FinancialDocument | undefined>;
  createFinancialDocument(data: InsertFinancialDocument): Promise<FinancialDocument>;
  updateFinancialDocument(id: string, userId: string, updates: Partial<FinancialDocument>): Promise<FinancialDocument | undefined>;

  // Calendar
  getCalendarEvents(userId: string, start?: Date, end?: Date): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string, userId: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, userId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: string, userId: string): Promise<boolean>;
  getCalendarParticipants(eventId: string): Promise<CalendarParticipant[]>;
  createCalendarParticipant(data: InsertCalendarParticipant): Promise<CalendarParticipant>;
  createCalendarParticipantsBatch(data: InsertCalendarParticipant[]): Promise<CalendarParticipant[]>;
  getTimezoneConflicts(userId: string, resolved?: boolean): Promise<TimezoneConflict[]>;
  createTimezoneConflict(data: InsertTimezoneConflict): Promise<TimezoneConflict>;
  createTimezoneConflictsBatch(data: InsertTimezoneConflict[]): Promise<TimezoneConflict[]>;
  updateTimezoneConflict(id: string, userId: string, updates: Partial<TimezoneConflict>): Promise<TimezoneConflict | undefined>;
  getAvailabilitySlots(userId: string): Promise<AvailabilitySlot[]>;
  setAvailabilitySlots(userId: string, slots: InsertAvailabilitySlot[]): Promise<AvailabilitySlot[]>;

  // Quarantine
  getQuarantineActions(userId: string): Promise<QuarantineAction[]>;
  getQuarantineAction(emailId: string, userId: string): Promise<QuarantineAction | undefined>;
  createQuarantineAction(data: InsertQuarantineAction): Promise<QuarantineAction>;
  updateQuarantineAction(id: string, userId: string, updates: Partial<QuarantineAction>): Promise<QuarantineAction | undefined>;
  getThreatScanLogs(emailId: string, userId?: string): Promise<ThreatScanLog[]>;
  createThreatScanLog(data: InsertThreatScanLog): Promise<ThreatScanLog>;

  // User Preferences
  getUserPreferencesRow(userId: string): Promise<UserPreferencesRow | undefined>;
  upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferencesRow>;

  // AI Chat History
  getChatHistory(userId: string, emailId?: string): Promise<AiChatHistory[]>;
  createChatMessage(data: InsertAiChatHistory): Promise<AiChatHistory>;
  deleteChatHistory(userId: string, emailId?: string): Promise<void>;

  // Threads
  getEmailThread(threadId: string, userId: string): Promise<Email[]>;
  getOrCreateEmailThread(threadId: string, userId: string, data: InsertEmailThread): Promise<EmailThread>;
  getThreadSummary(threadId: string, userId: string): Promise<EmailThread | undefined>;
  updateThreadSummary(threadId: string, userId: string, updates: Partial<EmailThread>): Promise<EmailThread | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(sql`LOWER(${users.username}) = ${username.toLowerCase()}`)
      .limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(sql`LOWER(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
    return user;
  }

  async getUserByMailbox(mailboxAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mailboxAddress, mailboxAddress)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  private buildFolderConditions(userId: string, folder: string) {
    const conditions = [eq(emails.userId, userId)];

    if (folder === "starred") {
      conditions.push(eq(emails.starred, true));
      conditions.push(ne(emails.folder, "trash"));
    } else if (folder === "all") {
      conditions.push(ne(emails.folder, "trash"));
      conditions.push(ne(emails.folder, "spam"));
      conditions.push(ne(emails.folder, "archive"));
      conditions.push(not(like(emails.folder, "custom:%")));
    } else if (folder === "pending-approvals") {
      conditions.push(isNotNull(emails.aiDraftReply));
      conditions.push(ne(emails.folder, "sent"));
      conditions.push(ne(emails.folder, "trash"));
    } else {
      conditions.push(eq(emails.folder, folder));
    }

    return conditions;
  }

  async getEmails(userId: string, folder: string, search?: string, label?: string, limit: number = 50, offset: number = 0): Promise<Email[]> {
    const conditions = this.buildFolderConditions(userId, folder);

    if (label) {
      conditions.push(sql`${label} = ANY(${emails.labels})`);
    }

    if (search) {
      const escaped = escapeIlike(search);
      conditions.push(
        or(
          ilike(emails.subject, `%${escaped}%`),
          ilike(emails.from, `%${escaped}%`),
          ilike(emails.preview, `%${escaped}%`),
          ilike(emails.body, `%${escaped}%`)
        )!
      );
    }

    return db
      .select()
      .from(emails)
      .where(and(...conditions))
      .orderBy(desc(emails.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getEmail(id: string, userId: string): Promise<Email | undefined> {
    const [email] = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .limit(1);
    return email;
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db.insert(emails).values(insertEmail).returning();
    return email;
  }

  async updateEmail(id: string, userId: string, updates: EmailUpdates): Promise<Email | undefined> {
    const [email] = await db
      .update(emails)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return email;
  }

  async updateEmails(updates: { id: string, values: EmailUpdates }[], userId: string): Promise<Email[]> {
    if (updates.length === 0) return [];

    const ids = updates.map(u => u.id);
    const allKeys = new Set(updates.flatMap(u => Object.keys(u.values)));

    const caseStatements: Record<string, any> = { id: emails.id };

    for (const key of allKeys) {
      const col = emails[key as keyof typeof emails];
      let statement = sql.raw(`case ${emails.id}`);
      for (const { id, values } of updates) {
        if (key in values) {
          statement = statement.append(sql` when ${id} then ${values[key as keyof EmailUpdates]}`);
        }
      }
      statement = statement.append(sql` else ${col} end`);
      caseStatements[key] = statement;
    }

    return db
      .update(emails)
      .set(caseStatements)
      .where(and(inArray(emails.id, ids), eq(emails.userId, userId)))
      .returning();
  }

  async deleteEmail(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async deleteEmails(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .delete(emails)
      .where(and(inArray(emails.id, ids), eq(emails.userId, userId)))
      .returning();
    return result.length;
  }

  async getEmailCounts(userId: string): Promise<Record<string, number>> {
    const countsQuery = db
      .select({
        inbox: sql<number>`count(*) filter (where folder = 'inbox' and read = false)`.as("inbox"),
        starred: sql<number>`count(*) filter (where starred = true and folder != 'trash')`.as("starred"),
        sent: sql<number>`count(*) filter (where folder = 'sent')`.as("sent"),
        drafts: sql<number>`count(*) filter (where folder = 'drafts')`.as("drafts"),
        archive: sql<number>`count(*) filter (where folder = 'archive')`.as("archive"),
        spam: sql<number>`count(*) filter (where folder = 'spam')`.as("spam"),
        trash: sql<number>`count(*) filter (where folder = 'trash')`.as("trash"),
        all: sql<number>`count(*) filter (where folder != 'trash' and folder != 'spam' and folder != 'archive' and not folder like 'custom:%')`.as("all"),
        "pending-approvals": sql<number>`count(*) filter (where ${emails.aiDraftReply} IS NOT NULL and folder != 'sent' and folder != 'trash')`.as("pending-approvals"),
        quarantine: sql<number>`count(*) filter (where folder = 'quarantine')`.as("quarantine"),
      })
      .from(emails)
      .where(eq(emails.userId, userId));

    const customFoldersQuery = db
      .select({
        folder: emails.folder,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(emails)
      .where(and(eq(emails.userId, userId), like(emails.folder, "custom:%")))
      .groupBy(emails.folder);

    const [mainCountsResult, customFolderCounts] = await Promise.all([
      countsQuery,
      customFoldersQuery,
    ]);

    const counts = mainCountsResult[0] as Record<string, number>;

    for (const row of customFolderCounts) {
      counts[row.folder] = Number(row.count);
    }

    return counts;
  }

  async getUnprocessedEmails(userId: string): Promise<Email[]> {
    return db
      .select()
      .from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.aiProcessed, false)))
      .orderBy(desc(emails.timestamp));
  }

  async getAgentActivity(userId: string): Promise<AgentActivity[]> {
    return db
      .select()
      .from(agentActivity)
      .where(eq(agentActivity.userId, userId))
      .orderBy(desc(agentActivity.createdAt))
      .limit(20);
  }

  async createAgentActivity(data: InsertAgentActivity): Promise<AgentActivity> {
    const [activity] = await db.insert(agentActivity).values(data).returning();
    return activity;
  }

  async updateAgentActivity(id: string, userId: string, updates: Partial<AgentActivity>): Promise<AgentActivity | undefined> {
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates as any;
    const [activity] = await db
      .update(agentActivity)
      .set(safeUpdates)
      .where(and(eq(agentActivity.id, id), eq(agentActivity.userId, userId)))
      .returning();
    return activity;
  }

  async getCustomFolders(userId: string): Promise<CustomFolder[]> {
    return db
      .select()
      .from(customFolders)
      .where(eq(customFolders.userId, userId))
      .orderBy(customFolders.name);
  }

  async getCustomFolder(id: string, userId: string): Promise<CustomFolder | undefined> {
    const [folder] = await db
      .select()
      .from(customFolders)
      .where(and(eq(customFolders.id, id), eq(customFolders.userId, userId)))
      .limit(1);
    return folder;
  }

  async getCustomFolderByName(userId: string, name: string, parentId?: string | null): Promise<CustomFolder | undefined> {
    const conditions = [eq(customFolders.userId, userId), eq(customFolders.name, name)];
    if (parentId) {
      conditions.push(eq(customFolders.parentId, parentId));
    } else {
      conditions.push(sql`${customFolders.parentId} IS NULL`);
    }
    const [folder] = await db
      .select()
      .from(customFolders)
      .where(and(...conditions))
      .limit(1);
    return folder;
  }

  async createCustomFolder(data: InsertCustomFolder): Promise<CustomFolder> {
    const [folder] = await db.insert(customFolders).values(data).returning();
    return folder;
  }

  async deleteCustomFolder(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(customFolders)
      .where(and(eq(customFolders.id, id), eq(customFolders.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async findDuplicateEmails(userId: string, signatures: string[]): Promise<Set<string>> {
    if (signatures.length === 0) return new Set();

    const rows = await db
      .select({ signature: sql<string>`${emails.subject} || '|' || ${emails.fromEmail} || '|' || ${emails.timestamp}` })
      .from(emails)
      .where(and(
        eq(emails.userId, userId),
        like(emails.folder, "custom:%"),
        inArray(sql<string>`${emails.subject} || '|' || ${emails.fromEmail} || '|' || ${emails.timestamp}`, signatures)
      ));

    return new Set(rows.map(r => r.signature));
  }

  async createEmails(emailsToInsert: InsertEmail[]): Promise<Email[]> {
    if (emailsToInsert.length === 0) return [];
    return db.insert(emails).values(emailsToInsert).returning();
  }

  // ─── FinOps ─────────────────────────────────────────────────────────────────

  async getFinancialDocuments(userId: string, filters?: { status?: string; emailId?: string }): Promise<FinancialDocument[]> {
    const conditions = [eq(financialDocuments.userId, userId)];
    if (filters?.status) conditions.push(eq(financialDocuments.status, filters.status));
    if (filters?.emailId) conditions.push(eq(financialDocuments.emailId, filters.emailId));
    return db.select().from(financialDocuments).where(and(...conditions)).orderBy(desc(financialDocuments.createdAt));
  }

  async getFinancialDocument(id: string, userId: string): Promise<FinancialDocument | undefined> {
    const [doc] = await db.select().from(financialDocuments)
      .where(and(eq(financialDocuments.id, id), eq(financialDocuments.userId, userId))).limit(1);
    return doc;
  }

  async getFinancialDocumentByEmail(emailId: string, userId: string): Promise<FinancialDocument | undefined> {
    const [doc] = await db.select().from(financialDocuments)
      .where(and(eq(financialDocuments.emailId, emailId), eq(financialDocuments.userId, userId))).limit(1);
    return doc;
  }

  async createFinancialDocument(data: InsertFinancialDocument): Promise<FinancialDocument> {
    const [doc] = await db.insert(financialDocuments).values(data).returning();
    return doc;
  }

  async updateFinancialDocument(id: string, userId: string, updates: Partial<FinancialDocument>): Promise<FinancialDocument | undefined> {
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...safeUpdates } = updates as any;
    safeUpdates.updatedAt = new Date();
    const [doc] = await db.update(financialDocuments).set(safeUpdates)
      .where(and(eq(financialDocuments.id, id), eq(financialDocuments.userId, userId))).returning();
    return doc;
  }

  // ─── Calendar ───────────────────────────────────────────────────────────────

  async getCalendarEvents(userId: string, start?: Date, end?: Date): Promise<CalendarEvent[]> {
    const conditions = [eq(calendarEvents.userId, userId)];
    if (start) conditions.push(sql`${calendarEvents.endTime} >= ${start}`);
    if (end) conditions.push(sql`${calendarEvents.startTime} <= ${end}`);
    return db.select().from(calendarEvents).where(and(...conditions)).orderBy(asc(calendarEvents.startTime));
  }

  async getCalendarEvent(id: string, userId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).limit(1);
    return event;
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(data).returning();
    return event;
  }

  async updateCalendarEvent(id: string, userId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates as any;
    safeUpdates.updatedAt = new Date();
    const [event] = await db.update(calendarEvents).set(safeUpdates)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
    return event;
  }

  async deleteCalendarEvent(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
    return result.length > 0;
  }

  async getCalendarParticipants(eventId: string): Promise<CalendarParticipant[]> {
    return db.select().from(calendarParticipants).where(eq(calendarParticipants.eventId, eventId));
  }

  async createCalendarParticipant(data: InsertCalendarParticipant): Promise<CalendarParticipant> {
    const [p] = await db.insert(calendarParticipants).values(data).returning();
    return p;
  }

  async createCalendarParticipantsBatch(data: InsertCalendarParticipant[]): Promise<CalendarParticipant[]> {
    if (data.length === 0) return [];
    return db.insert(calendarParticipants).values(data).returning();
  }

  async getTimezoneConflicts(userId: string, resolved?: boolean): Promise<TimezoneConflict[]> {
    const conditions = [eq(timezoneConflicts.userId, userId)];
    if (resolved !== undefined) conditions.push(eq(timezoneConflicts.resolved, resolved));
    return db.select().from(timezoneConflicts).where(and(...conditions)).orderBy(desc(timezoneConflicts.createdAt));
  }

  async createTimezoneConflict(data: InsertTimezoneConflict): Promise<TimezoneConflict> {
    const [c] = await db.insert(timezoneConflicts).values(data).returning();
    return c;
  }

  async createTimezoneConflictsBatch(data: InsertTimezoneConflict[]): Promise<TimezoneConflict[]> {
    if (data.length === 0) return [];
    return db.insert(timezoneConflicts).values(data).returning();
  }

  async updateTimezoneConflict(id: string, userId: string, updates: Partial<TimezoneConflict>): Promise<TimezoneConflict | undefined> {
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates as any;
    const [c] = await db.update(timezoneConflicts).set(safeUpdates)
      .where(and(eq(timezoneConflicts.id, id), eq(timezoneConflicts.userId, userId))).returning();
    return c;
  }

  async getAvailabilitySlots(userId: string): Promise<AvailabilitySlot[]> {
    return db.select().from(availabilitySlots)
      .where(eq(availabilitySlots.userId, userId)).orderBy(asc(availabilitySlots.dayOfWeek));
  }

  async setAvailabilitySlots(userId: string, slots: InsertAvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    await db.delete(availabilitySlots).where(eq(availabilitySlots.userId, userId));
    if (slots.length === 0) return [];
    return db.insert(availabilitySlots).values(slots).returning();
  }

  // ─── Quarantine ─────────────────────────────────────────────────────────────

  async getQuarantineActions(userId: string): Promise<QuarantineAction[]> {
    return db.select().from(quarantineActions)
      .where(eq(quarantineActions.userId, userId)).orderBy(desc(quarantineActions.createdAt));
  }

  async getQuarantineAction(emailId: string, userId: string): Promise<QuarantineAction | undefined> {
    const [action] = await db.select().from(quarantineActions)
      .where(and(eq(quarantineActions.emailId, emailId), eq(quarantineActions.userId, userId))).limit(1);
    return action;
  }

  async createQuarantineAction(data: InsertQuarantineAction): Promise<QuarantineAction> {
    const [action] = await db.insert(quarantineActions).values(data).returning();
    return action;
  }

  async updateQuarantineAction(id: string, userId: string, updates: Partial<QuarantineAction>): Promise<QuarantineAction | undefined> {
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates as any;
    const [action] = await db.update(quarantineActions).set(safeUpdates)
      .where(and(eq(quarantineActions.id, id), eq(quarantineActions.userId, userId))).returning();
    return action;
  }

  async getThreatScanLogs(emailId: string, userId?: string): Promise<ThreatScanLog[]> {
    const conditions = [eq(threatScanLogs.emailId, emailId)];
    if (userId) conditions.push(eq(threatScanLogs.userId, userId));
    return db.select().from(threatScanLogs)
      .where(and(...conditions)).orderBy(desc(threatScanLogs.createdAt));
  }

  async createThreatScanLog(data: InsertThreatScanLog): Promise<ThreatScanLog> {
    const [log] = await db.insert(threatScanLogs).values(data).returning();
    return log;
  }

  // ─── Threads ────────────────────────────────────────────────────────────────

  async getEmailThread(threadId: string, userId: string): Promise<Email[]> {
    return db.select().from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.threadId, threadId)))
      .orderBy(asc(emails.timestamp));
  }

  async getOrCreateEmailThread(threadId: string, userId: string, data: InsertEmailThread): Promise<EmailThread> {
    const [existing] = await db.select().from(emailThreads)
      .where(and(eq(emailThreads.id, threadId), eq(emailThreads.userId, userId))).limit(1);
    if (existing) {
      const [updated] = await db.update(emailThreads)
        .set({ messageCount: data.messageCount, lastMessageDate: data.lastMessageDate, updatedAt: new Date() })
        .where(eq(emailThreads.id, threadId)).returning();
      return updated;
    }
    const [thread] = await db.insert(emailThreads).values(data).returning();
    return thread;
  }

  async getThreadSummary(threadId: string, userId: string): Promise<EmailThread | undefined> {
    const [thread] = await db.select().from(emailThreads)
      .where(and(eq(emailThreads.id, threadId), eq(emailThreads.userId, userId))).limit(1);
    return thread;
  }

  async updateThreadSummary(threadId: string, userId: string, updates: Partial<EmailThread>): Promise<EmailThread | undefined> {
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates as any;
    safeUpdates.updatedAt = new Date();
    const [thread] = await db.update(emailThreads).set(safeUpdates)
      .where(and(eq(emailThreads.id, threadId), eq(emailThreads.userId, userId))).returning();
    return thread;
  }

  // ─── User Preferences ──────────────────────────────────────────────────────

  async getUserPreferencesRow(userId: string): Promise<UserPreferencesRow | undefined> {
    const [prefs] = await db.select().from(userPreferences)
      .where(eq(userPreferences.userId, userId)).limit(1);
    return prefs;
  }

  async upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferencesRow> {
    const [result] = await db.insert(userPreferences)
      .values({ userId, ...prefs })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { ...prefs, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  // ─── AI Chat History ───────────────────────────────────────────────────────

  async getChatHistory(userId: string, emailId?: string): Promise<AiChatHistory[]> {
    const conditions = [eq(aiChatHistory.userId, userId)];
    if (emailId) conditions.push(eq(aiChatHistory.emailId, emailId));
    return db.select().from(aiChatHistory)
      .where(and(...conditions))
      .orderBy(asc(aiChatHistory.createdAt))
      .limit(100);
  }

  async createChatMessage(data: InsertAiChatHistory): Promise<AiChatHistory> {
    const [msg] = await db.insert(aiChatHistory).values(data).returning();
    return msg;
  }

  async deleteChatHistory(userId: string, emailId?: string): Promise<void> {
    const conditions = [eq(aiChatHistory.userId, userId)];
    if (emailId) conditions.push(eq(aiChatHistory.emailId, emailId));
    await db.delete(aiChatHistory).where(and(...conditions));
  }
}

export const storage = new DatabaseStorage();
