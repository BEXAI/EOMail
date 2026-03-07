import { type User, type InsertUser, type Email, type InsertEmail, type AgentActivity, type InsertAgentActivity, type CustomFolder, type InsertCustomFolder, type AiChatHistory, type InsertAiChatHistory, users, emails, agentActivity, customFolders, aiChatHistory } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, inArray, ne, not, like, sql, isNotNull } from "drizzle-orm";

type EmailUpdates = Partial<Pick<Email, "read" | "starred" | "folder" | "labels" | "to" | "toEmail" | "cc" | "bcc" | "subject" | "body" | "preview" | "aiSummary" | "aiCategory" | "aiUrgency" | "aiSuggestedAction" | "aiDraftReply" | "aiSpamScore" | "aiSpamReason" | "aiProcessed">>;

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

  getAiChatHistory(userId: string, emailId?: string | null): Promise<AiChatHistory[]>;
  createAiChatHistoryMessage(data: InsertAiChatHistory): Promise<AiChatHistory>;
  deleteAiChatHistoryForEmail(userId: string, emailId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
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
      conditions.push(
        or(
          ilike(emails.subject, `%${search}%`),
          ilike(emails.from, `%${search}%`),
          ilike(emails.preview, `%${search}%`),
          ilike(emails.body, `%${search}%`)
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
      .set(updates)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return email;
  }

  async updateEmails(updates: { id: string, values: EmailUpdates }[], userId: string): Promise<Email[]> {
    if (updates.length === 0) return [];

    const ids = updates.map(u => u.id);
    const allKeys = Array.from(new Set(updates.flatMap(u => Object.keys(u.values))));

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

  async getAiChatHistory(userId: string, emailId?: string | null): Promise<AiChatHistory[]> {
    const conditions = [eq(aiChatHistory.userId, userId)];

    if (emailId) {
      conditions.push(eq(aiChatHistory.emailId, emailId));
    } else if (emailId === null) {
      conditions.push(sql`${aiChatHistory.emailId} IS NULL`);
    }

    return db
      .select()
      .from(aiChatHistory)
      .where(and(...conditions))
      .orderBy(aiChatHistory.createdAt);
  }

  async createAiChatHistoryMessage(data: InsertAiChatHistory): Promise<AiChatHistory> {
    const [message] = await db.insert(aiChatHistory).values(data).returning();
    return message;
  }

  async deleteAiChatHistoryForEmail(userId: string, emailId: string): Promise<boolean> {
    const result = await db
      .delete(aiChatHistory)
      .where(and(eq(aiChatHistory.userId, userId), eq(aiChatHistory.emailId, emailId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
