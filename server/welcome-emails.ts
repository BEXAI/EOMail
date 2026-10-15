import { type InsertEmail, type User } from "@shared/schema";
import { storage } from "./storage";

const SENDER_NAME = "EOMail Team";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type WelcomeTemplate = Omit<InsertEmail, "userId" | "to" | "toEmail" | "timestamp" | "fromEmail" | "from">;

function buildTemplates(firstName: string, address: string): WelcomeTemplate[] {
  const name = escapeHtml(firstName);
  const addr = escapeHtml(address);
  return [
    {
      subject: `Welcome to EOMail, ${firstName}`,
      preview: `Your new address ${address} is live and ready to receive mail.`,
      body: `<p>Hi ${name},</p>
<p>Welcome to EOMail. Your new address is live:</p>
<p style="font-size:1.1em"><strong>${addr}</strong></p>
<p>Anything sent to that address lands right here, and your AI agents get to work on it the moment it arrives: summarizing, sorting, flagging what needs you, and drafting replies.</p>
<p>The quickest way to see it in action: send an email to <strong>${addr}</strong> from another account (Gmail, Outlook, your phone). It will show up in this inbox within seconds.</p>
<p>Glad you're here,<br/>The EOMail Team</p>`,
      aiSummary: `Your EOMail address ${address} is active. Send it a test message from another account to see mail arrive.`,
      aiCategory: "notification",
      aiUrgency: "high",
      aiSuggestedAction: "review",
    },
    {
      subject: "5 things to try in your first 5 minutes",
      preview: "Command bar, AI chat, morning briefing, auto-organize, and keyboard shortcuts.",
      body: `<p>Hi ${name}, here are the fastest ways to get value from EOMail:</p>
<ol>
<li><strong>Command bar (⌘K / Ctrl+K)</strong>: tell EOMail what to do in plain English: "archive all newsletters" or "what's urgent today?"</li>
<li><strong>AI chat</strong>: open the chat panel and ask questions about your inbox or any email you're reading.</li>
<li><strong>Morning briefing</strong>: a daily summary of what came in, what needs a reply, and what your agents handled.</li>
<li><strong>Auto-organize</strong>: one click in the sidebar sorts your inbox into smart folders.</li>
<li><strong>Keyboard shortcuts</strong>: press <code>?</code> anywhere to see them all.</li>
</ol>
<p>The EOMail Team</p>`,
      aiSummary: "Quick-start guide: command bar (⌘K), AI chat, morning briefing, auto-organize, and keyboard shortcuts (?).",
      aiCategory: "action-required",
      aiUrgency: "medium",
      aiSuggestedAction: "review",
    },
    {
      subject: "Meet your AI agents",
      preview: "Aegis guards against phishing, FinOps tracks invoices, and Chrono handles scheduling.",
      body: `<p>Hi ${name},</p>
<p>Three specialist agents work on every email that reaches you:</p>
<ul>
<li><strong>Aegis</strong> (security): scores each message for phishing and impersonation, and quarantines anything dangerous before you see it. Review it under <em>Security</em>.</li>
<li><strong>FinOps</strong> (finance): pulls amounts, due dates, and vendors out of invoices and receipts. Find them under <em>FinOps</em>.</li>
<li><strong>Chrono</strong> (calendar): spots meeting requests, detects time-zone conflicts, and suggests times. Find them under <em>Calendar</em>.</li>
</ul>
<p>You can see what each agent has done in the activity feed.</p>
<p>The EOMail Team</p>`,
      aiSummary: "Overview of the Aegis (security), FinOps (finance), and Chrono (calendar) agents and where to find their work.",
      aiCategory: "newsletter",
      aiUrgency: "low",
      aiSuggestedAction: "archive",
    },
    {
      subject: "Make EOMail yours",
      preview: "Set your time zone and working hours so your agents schedule around you.",
      body: `<p>Hi ${name},</p>
<p>Two settings make your agents noticeably smarter:</p>
<ul>
<li><strong>Time zone</strong>: so meeting suggestions and briefings land at the right local time.</li>
<li><strong>Working hours</strong>: so Chrono never proposes a 7am call.</li>
</ul>
<p>Open <em>Settings</em> from the sidebar to set them. It takes about 30 seconds.</p>
<p>The EOMail Team</p>`,
      aiSummary: "Set your time zone and working hours in Settings so scheduling suggestions fit your day.",
      aiCategory: "notification",
      aiUrgency: "low",
      aiSuggestedAction: "review",
    },
  ];
}

/**
 * Seeds a newly registered user's inbox with welcome emails.
 * Emails are pre-marked as AI-processed so the pipeline doesn't spend credits on them.
 */
export async function seedWelcomeEmails(user: Pick<User, "id" | "displayName" | "email" | "mailboxAddress">): Promise<number> {
  const domain = process.env.DOMAIN || "eomail.co";
  const address = user.mailboxAddress || user.email;
  const firstName = user.displayName.split(" ")[0] || user.displayName;
  const now = Date.now();

  const emails: InsertEmail[] = buildTemplates(firstName, address).map((t, i) => ({
    ...t,
    userId: user.id,
    from: SENDER_NAME,
    fromEmail: `welcome@${domain}`,
    to: user.displayName,
    toEmail: address,
    // Newest first in the list: the welcome email gets the latest timestamp
    timestamp: new Date(now - i * 60_000),
    read: false,
    folder: "inbox",
    aiProcessed: true,
    aiSpamScore: 0,
  }));

  const created = await storage.createEmails(emails);
  return created.length;
}
