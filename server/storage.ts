import { type User, type InsertUser, type Email, type InsertEmail, type AgentActivity, type InsertAgentActivity, users, emails, agentActivity } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, inArray, ne, sql, isNotNull } from "drizzle-orm";

type EmailUpdates = Partial<Pick<Email, "read" | "starred" | "folder" | "labels" | "aiSummary" | "aiCategory" | "aiUrgency" | "aiSuggestedAction" | "aiDraftReply" | "aiSpamScore" | "aiSpamReason" | "aiProcessed">>;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getEmails(userId: string, folder: string, search?: string, label?: string): Promise<Email[]>;
  getEmail(id: string, userId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, userId: string, updates: EmailUpdates): Promise<Email | undefined>;
  updateEmails(ids: string[], userId: string, updates: EmailUpdates): Promise<Email[]>;
  deleteEmail(id: string, userId: string): Promise<boolean>;
  deleteEmails(ids: string[], userId: string): Promise<number>;
  getEmailCounts(userId: string): Promise<Record<string, number>>;
  seedEmailsForUser(userId: string): Promise<void>;

  getUnprocessedEmails(userId: string): Promise<Email[]>;

  getAgentActivity(userId: string): Promise<AgentActivity[]>;
  createAgentActivity(data: InsertAgentActivity): Promise<AgentActivity>;
  updateAgentActivity(id: string, userId: string, updates: Partial<AgentActivity>): Promise<AgentActivity | undefined>;
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

  private buildFolderConditions(userId: string, folder: string) {
    const conditions = [eq(emails.userId, userId)];

    if (folder === "starred") {
      conditions.push(eq(emails.starred, true));
      conditions.push(ne(emails.folder, "trash"));
    } else if (folder === "all") {
      conditions.push(ne(emails.folder, "trash"));
      conditions.push(ne(emails.folder, "spam"));
    } else if (folder === "pending-approvals") {
      conditions.push(isNotNull(emails.aiDraftReply));
      conditions.push(ne(emails.folder, "sent"));
      conditions.push(ne(emails.folder, "trash"));
    } else {
      conditions.push(eq(emails.folder, folder));
    }

    return conditions;
  }

  async getEmails(userId: string, folder: string, search?: string, label?: string): Promise<Email[]> {
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

  async updateEmail(id: string, userId: string, updates: EmailUpdates): Promise<Email | undefined> {
    const [email] = await db
      .update(emails)
      .set(updates)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return email;
  }

  async updateEmails(ids: string[], userId: string, updates: EmailUpdates): Promise<Email[]> {
    if (ids.length === 0) return [];
    return db
      .update(emails)
      .set(updates)
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
    const rows = await db
      .select({
        folder: emails.folder,
        read: emails.read,
        starred: emails.starred,
        hasDraft: sql<boolean>`${emails.aiDraftReply} IS NOT NULL`,
      })
      .from(emails)
      .where(eq(emails.userId, userId));

    const counts: Record<string, number> = {
      inbox: 0,
      starred: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0,
      all: 0,
      "pending-approvals": 0,
    };

    for (const row of rows) {
      if (row.folder === "inbox" && !row.read) counts.inbox++;
      if (row.starred && row.folder !== "trash") counts.starred++;
      if (row.folder === "sent") counts.sent++;
      if (row.folder === "drafts") counts.drafts++;
      if (row.folder === "spam") counts.spam++;
      if (row.folder === "trash") counts.trash++;
      if (row.folder !== "trash" && row.folder !== "spam") counts.all++;
      if (row.hasDraft && row.folder !== "sent" && row.folder !== "trash") counts["pending-approvals"]++;
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

  async seedEmailsForUser(userId: string): Promise<void> {
    const now = new Date();
    const hour = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
    const day = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const seedEmails: InsertEmail[] = [
      {
        userId,
        from: "AIMAIL Team",
        fromEmail: "team@aimail.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Welcome to AIMAIL — Your Autonomous Chief of Staff",
        body: `<p>Welcome to <strong>AIMAIL</strong> — where your inbox becomes an autonomous, action-oriented Chief of Staff.</p><p>Our mission: shift you from "Inbox Zero" to <strong>"Zero Time Spent."</strong></p><p>Your three AI agents are standing by:</p><ul><li><strong>FinOps Auto-Resolver</strong> — Silently intercepts receipts, invoices, and subscription notices</li><li><strong>Chrono-Logistics Coordinator</strong> — Eliminates calendar ping-pong by auto-scheduling meetings</li><li><strong>Aegis Gatekeeper</strong> — Shields you from phishing, impersonation, and spam</li></ul><p>Press <kbd>⌘K</kbd> to open the AI Action Center and start commanding your inbox.</p><p>— The AIMAIL Team</p>`,
        preview: "Welcome to AIMAIL — where your inbox becomes an autonomous, action-oriented Chief of Staff.",
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
        subject: "Q4 Product Roadmap - Final Review Needed",
        body: `<p>Hi,</p><p>I've attached the final version of the Q4 product roadmap for your review. Please take a look and let me know if you have any questions or concerns before our meeting tomorrow at 10am.</p><p>Key highlights:</p><ul><li>New AI features launch in October</li><li>Mobile app redesign in November</li><li>Enterprise tier rollout in December</li></ul><p>Looking forward to your feedback!</p><p>Best,<br>Sarah</p>`,
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
        from: "Stripe",
        fromEmail: "receipts@stripe.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Payment receipt — $29.00 for AIMAIL Pro",
        body: `<p>Thank you for your payment.</p><table style="border-collapse:collapse;width:100%;max-width:400px"><tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Amount</strong></td><td style="padding:8px;border-bottom:1px solid #eee">$29.00</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Date</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${now.toLocaleDateString()}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Plan</strong></td><td style="padding:8px;border-bottom:1px solid #eee">AIMAIL Pro (Monthly)</td></tr><tr><td style="padding:8px"><strong>Card</strong></td><td style="padding:8px">•••• 4242</td></tr></table><p>Your subscription will renew automatically. <a href="#">Manage subscription</a></p>`,
        preview: "Payment receipt for $29.00 — AIMAIL Pro (Monthly). Card ending in 4242.",
        timestamp: hour(3),
        read: false,
        starred: false,
        folder: "inbox",
        labels: ["finance"],
        attachments: 1,
      },
      {
        userId,
        from: "PayPal",
        fromEmail: "service@paypal.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "You sent $150.00 to Freelancer Design Co.",
        body: `<p>You sent a payment</p><p><strong>$150.00 USD</strong> to Freelancer Design Co.</p><p>Transaction ID: TX-9284756<br>Date: ${day(1).toLocaleDateString()}</p><p>If you didn't authorize this payment, <a href="#">contact us immediately</a>.</p>`,
        preview: "You sent $150.00 USD to Freelancer Design Co. Transaction ID: TX-9284756.",
        timestamp: day(1),
        read: true,
        starred: false,
        folder: "inbox",
        labels: ["finance"],
        attachments: 0,
      },
      {
        userId,
        from: "Priya Patel",
        fromEmail: "priya@venturelab.vc",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Coffee chat next week? Let's sync on AIMAIL",
        body: `<p>Hi there,</p><p>I came across your work on AI email tooling and I'm incredibly impressed. At VentureLab, we're actively looking for startups in the productivity and AI space.</p><p>Would love to grab a virtual coffee and hear more about your vision for AIMAIL. Are you free Tuesday at 10 AM or Wednesday afternoon next week?</p><p>Best,<br>Priya Patel<br>Partner, VentureLab VC</p>`,
        preview: "I came across your work on AI email tooling. Would love to grab a virtual coffee next week...",
        timestamp: hour(5),
        read: false,
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
        timestamp: hour(7),
        read: true,
        starred: true,
        folder: "inbox",
        labels: ["design"],
        attachments: 1,
      },
      {
        userId,
        from: "Netflix",
        fromEmail: "info@mailer.netflix.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "Your Netflix price is increasing to $22.99/mo",
        body: `<p>Hi there,</p><p>We're writing to let you know that your Netflix Premium plan will increase from $19.99/mo to $22.99/mo starting next billing cycle.</p><p>This change reflects our continued investment in great content. No action is needed — your plan will automatically update.</p><p>If you'd like to change your plan or cancel, visit <a href="#">account settings</a>.</p>`,
        preview: "Your Netflix Premium plan will increase from $19.99/mo to $22.99/mo starting next billing cycle.",
        timestamp: day(1),
        read: true,
        starred: false,
        folder: "inbox",
        labels: ["finance"],
        attachments: 0,
      },
      {
        userId,
        from: "TechCrunch Daily",
        fromEmail: "newsletter@techcrunch.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "TechCrunch Daily: AI agents are reshaping enterprise workflows",
        body: `<p><strong>Today's top stories:</strong></p><p><strong>1. AI agents are reshaping enterprise workflows</strong><br>Major enterprises are deploying autonomous AI agents for email triage, customer support, and financial reconciliation. Analysts predict a $45B market by 2027.</p><p><strong>2. OpenAI releases GPT-5 for enterprise</strong><br>The latest model shows 3x improvement in agentic reasoning tasks.</p><p><strong>3. Startup Spotlight: AIMAIL raises $12M Series A</strong><br>The AI-powered email assistant announces funding from VentureLab VC.</p><p><a href="#">Read more →</a></p>`,
        preview: "Today's top stories: AI agents reshaping enterprise workflows. OpenAI releases GPT-5...",
        timestamp: day(2),
        read: true,
        starred: false,
        folder: "inbox",
        labels: [],
        attachments: 0,
      },
      {
        userId,
        from: "GitHub",
        fromEmail: "noreply@github.com",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "[aimail/core] Pull request merged: Feature/ai-compose #247",
        body: `<p>A pull request was merged into <strong>aimail/core</strong>.</p><p><strong>Feature/ai-compose</strong> by <a href="#">@dev-team</a></p><p>This PR adds the new AI compose feature that suggests email completions as you type.</p><p>Files changed: 12 | +847 / -124</p><p><a href="#">View on GitHub</a></p>`,
        preview: "A pull request was merged into aimail/core. Feature/ai-compose by @dev-team",
        timestamp: hour(8),
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
        subject: "Re: Q4 Product Roadmap - Final Review Needed",
        body: `<p>Hi Sarah,</p><p>Thanks for sending this over! I've reviewed the roadmap and it looks great. I have a few minor comments:</p><ul><li>The October launch timeline seems tight — can we build in a week of buffer?</li><li>The mobile redesign scope might need additional resources</li></ul><p>Let's discuss tomorrow. See you at 10am!</p><p>Best</p>`,
        preview: "Thanks for sending this over! I've reviewed the roadmap and it looks great.",
        timestamp: hour(1.5),
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
        from: "Account Security",
        fromEmail: "security-alert@g00gle-support.xyz",
        to: "You",
        toEmail: "me@aimail.com",
        subject: "URGENT: Unusual sign-in activity on your account",
        body: `<p><strong>⚠️ We detected unusual activity on your account</strong></p><p>Someone may have accessed your account from a new device in Russia. If this wasn't you, please verify your identity immediately by clicking the link below:</p><p><a href="#">Verify your identity NOW →</a></p><p>If you don't act within 24 hours, your account will be permanently suspended.</p><p>Google Account Security Team</p>`,
        preview: "URGENT: Unusual sign-in activity detected. Verify your identity immediately or your account will be suspended.",
        timestamp: day(3),
        read: true,
        starred: false,
        folder: "spam",
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
        body: `<p>Dear Friend,</p><p>I am the son of a late Nigerian Prince and you have been selected to receive $4.5 million dollars. Please send your bank details immediately to claim your inheritance.</p><p>This is a time-sensitive matter. Act now!</p>`,
        preview: "I am the son of a late Nigerian Prince and you have been selected to receive $4.5 million...",
        timestamp: day(4),
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
