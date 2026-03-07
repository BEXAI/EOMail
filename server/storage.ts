import { type User, type InsertUser, type Email, type InsertEmail, users, emails } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, inArray, ne, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getEmails(userId: string, folder: string, search?: string, label?: string): Promise<Email[]>;
  getEmail(id: string, userId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, userId: string, updates: Partial<Email>): Promise<Email | undefined>;
  updateEmails(ids: string[], userId: string, updates: Partial<Email>): Promise<Email[]>;
  deleteEmail(id: string, userId: string): Promise<boolean>;
  deleteEmails(ids: string[], userId: string): Promise<number>;
  getEmailCounts(userId: string): Promise<Record<string, number>>;
  seedEmailsForUser(userId: string): Promise<void>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getEmails(userId: string, folder: string, search?: string, label?: string): Promise<Email[]> {
    const conditions = [eq(emails.userId, userId)];

    if (folder === "starred") {
      conditions.push(eq(emails.starred, true));
      conditions.push(ne(emails.folder, "trash"));
    } else if (folder === "all") {
      conditions.push(ne(emails.folder, "trash"));
      conditions.push(ne(emails.folder, "spam"));
    } else {
      conditions.push(eq(emails.folder, folder));
    }

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
      .orderBy(desc(emails.timestamp));
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

  async updateEmail(id: string, userId: string, updates: Partial<Email>): Promise<Email | undefined> {
    const { id: _id, userId: _uid, createdAt: _ca, ...safeUpdates } = updates as any;
    const [email] = await db
      .update(emails)
      .set(safeUpdates)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return email;
  }

  async updateEmails(ids: string[], userId: string, updates: Partial<Email>): Promise<Email[]> {
    if (ids.length === 0) return [];
    const { id: _id, userId: _uid, createdAt: _ca, ...safeUpdates } = updates as any;
    return db
      .update(emails)
      .set(safeUpdates)
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
    const allEmails = await db
      .select({
        folder: emails.folder,
        read: emails.read,
        starred: emails.starred,
      })
      .from(emails)
      .where(eq(emails.userId, userId));

    return {
      inbox: allEmails.filter((e) => e.folder === "inbox" && !e.read).length,
      starred: allEmails.filter((e) => e.starred && e.folder !== "trash").length,
      sent: allEmails.filter((e) => e.folder === "sent").length,
      drafts: allEmails.filter((e) => e.folder === "drafts").length,
      spam: allEmails.filter((e) => e.folder === "spam").length,
      trash: allEmails.filter((e) => e.folder === "trash").length,
      all: allEmails.filter((e) => e.folder !== "trash" && e.folder !== "spam").length,
    };
  }

  async seedEmailsForUser(userId: string): Promise<void> {
    const now = new Date();
    const hour = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
    const day = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const seedEmails: InsertEmail[] = [
      {
        userId,
        from: "Google AI Team",
        fromEmail: "ai-team@google.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Welcome to the future of AI-powered email",
        body: `<p>Dear User,</p><p>Welcome to AIMAIL — the next generation of intelligent email. We're thrilled to have you on board.</p><p>With AIMAIL, you can expect:</p><ul><li>Smart email categorization powered by AI</li><li>Intelligent reply suggestions</li><li>Automatic spam detection</li><li>Priority inbox that learns your habits</li></ul><p>We're constantly improving the experience and would love your feedback.</p><p>Best regards,<br>The AIMAIL Team</p>`,
        preview: "Welcome to AIMAIL — the next generation of intelligent email. We're thrilled to have you on board.",
        timestamp: hour(0.5),
        read: false,
        starred: true,
        folder: "inbox",
        labels: ["important"],
        attachments: 0,
      },
      {
        userId,
        from: "Sarah Johnson",
        fromEmail: "sarah.johnson@techcorp.io",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Q4 Product Roadmap - Final Review",
        body: `<p>Hi,</p><p>I've attached the final version of the Q4 product roadmap for your review. Please take a look and let me know if you have any questions or concerns before our meeting tomorrow.</p><p>Key highlights:</p><ul><li>New AI features launch in October</li><li>Mobile app redesign in November</li><li>Enterprise tier rollout in December</li></ul><p>Looking forward to your feedback!</p><p>Best,<br>Sarah</p>`,
        preview: "I've attached the final version of the Q4 product roadmap for your review. Please take a look...",
        timestamp: hour(2),
        read: false,
        starred: false,
        folder: "inbox",
        labels: ["work"],
        attachments: 2,
      },
      {
        userId,
        from: "GitHub",
        fromEmail: "noreply@github.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "[aimail/core] Pull request merged: Feature/ai-compose #247",
        body: `<p>A pull request was merged into <strong>aimail/core</strong>.</p><p><strong>Feature/ai-compose</strong> by <a href="#">@dev-team</a></p><p>This PR adds the new AI compose feature that suggests email completions as you type.</p><p><a href="#">View on GitHub</a></p>`,
        preview: "A pull request was merged into aimail/core. Feature/ai-compose by @dev-team",
        timestamp: hour(4),
        read: true,
        starred: false,
        folder: "inbox",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "Marcus Chen",
        fromEmail: "m.chen@designstudio.co",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Re: Brand identity refresh - thoughts?",
        body: `<p>Hey,</p><p>Thanks for the quick turnaround on the logo concepts! I've reviewed all three options with the team and we're leaning towards Option B — it feels more modern while still maintaining brand continuity.</p><p>A few tweaks we'd like to explore:</p><ol><li>Slightly bolder typography in the wordmark</li><li>A darker shade of the primary blue</li><li>Removing the gradient from the icon</li></ol><p>Can we jump on a quick call this week to discuss?</p><p>Cheers,<br>Marcus</p>`,
        preview: "Thanks for the quick turnaround on the logo concepts! We're leaning towards Option B...",
        timestamp: hour(6),
        read: true,
        starred: true,
        folder: "inbox",
        labels: ["design"],
        attachments: 1,
      },
      {
        userId,
        from: "Stripe",
        fromEmail: "receipts@stripe.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Your receipt from AIMAIL Pro - $29.00",
        body: `<p>Thank you for your payment.</p><p><strong>Amount:</strong> $29.00<br><strong>Date:</strong> ${now.toLocaleDateString()}<br><strong>Plan:</strong> AIMAIL Pro (Monthly)</p><p>Your subscription will renew on the same date next month. If you have any questions, please contact our support team.</p>`,
        preview: "Thank you for your payment. Amount: $29.00 | AIMAIL Pro (Monthly)",
        timestamp: day(1),
        read: true,
        starred: false,
        folder: "inbox",
        labels: ["finance"],
        attachments: 1,
      },
      {
        userId,
        from: "Priya Patel",
        fromEmail: "priya@venturelab.vc",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Coffee chat next week?",
        body: `<p>Hi there,</p><p>I came across your work on AI email tooling and I'm incredibly impressed. At VentureLab, we're actively looking for startups in the productivity and AI space.</p><p>Would love to grab a virtual coffee and hear more about your vision for AIMAIL. Are you free any afternoon next week?</p><p>Best,<br>Priya Patel<br>Partner, VentureLab VC</p>`,
        preview: "I came across your work on AI email tooling and I'm incredibly impressed. Would love to grab...",
        timestamp: day(1),
        read: false,
        starred: false,
        folder: "inbox",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "Netflix",
        fromEmail: "info@mailer.netflix.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "New on Netflix: Shows you'll love this October",
        body: `<p>Based on your watching history, here are our top picks for you this month:</p><ul><li>The AI Chronicles - Season 2</li><li>Code Breakers</li><li>Tomorrow's World Documentary</li></ul><p>Start watching now.</p>`,
        preview: "Based on your watching history, here are our top picks for you this month...",
        timestamp: day(2),
        read: true,
        starred: false,
        folder: "inbox",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "You",
        fromEmail: "me@aimail.com",
        to: "Sarah Johnson",
        toEmail: "sarah.johnson@techcorp.io",
        subject: "Re: Q4 Product Roadmap - Final Review",
        body: `<p>Hi Sarah,</p><p>Thanks for sending this over! I've reviewed the roadmap and it looks great. I have a few minor comments:</p><ul><li>The October launch timeline seems tight — can we build in a week of buffer?</li><li>The mobile redesign scope might need additional resources</li></ul><p>Let's discuss tomorrow. See you at 10am!</p><p>Best</p>`,
        preview: "Thanks for sending this over! I've reviewed the roadmap and it looks great. I have a few minor...",
        timestamp: hour(3),
        read: true,
        starred: false,
        folder: "sent",
        labels: ["work"],
        attachments: 0,
      },
      {
        userId,
        from: "You",
        fromEmail: "me@aimail.com",
        to: "Marcus Chen",
        toEmail: "m.chen@designstudio.co",
        subject: "Re: Brand identity refresh - thoughts?",
        body: `<p>Marcus,</p><p>Great feedback! Option B was my personal favorite too. I'll get started on those refinements right away.</p><p>I'm free Thursday at 2pm or Friday morning for a call — let me know what works for you.</p><p>Best</p>`,
        preview: "Great feedback! Option B was my personal favorite too. I'll get started on those refinements...",
        timestamp: hour(5),
        read: true,
        starred: false,
        folder: "sent",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "You",
        fromEmail: "me@aimail.com",
        to: "Team",
        toEmail: "team@aimail.com",
        subject: "Weekly sync notes - [DRAFT]",
        body: `<p>Team,</p><p>Here are the notes from today's sync:</p><p><em>This is a draft — still editing...</em></p>`,
        preview: "Here are the notes from today's sync: This is a draft — still editing...",
        timestamp: hour(1),
        read: true,
        starred: false,
        folder: "drafts",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "Nigerian Prince Foundation",
        fromEmail: "prince@totallylegit-money.biz",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "URGENT: You have inherited $4.5 MILLION dollars",
        body: `<p>Dear Friend,</p><p>I am the son of a late Nigerian Prince and you have been selected to receive $4.5 million dollars. Please send your bank details immediately...</p>`,
        preview: "I am the son of a late Nigerian Prince and you have been selected to receive $4.5 million...",
        timestamp: day(3),
        read: true,
        starred: false,
        folder: "spam",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "Old Newsletter",
        fromEmail: "noreply@somenewsletter.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Unsubscribe confirmation",
        body: `<p>You have been successfully unsubscribed from our mailing list.</p>`,
        preview: "You have been successfully unsubscribed from our mailing list.",
        timestamp: day(5),
        read: true,
        starred: false,
        folder: "trash",
        labels: [],
        attachments: 0,
      },
    ];

    await db.insert(emails).values(seedEmails);
  }
}

export const storage = new DatabaseStorage();
