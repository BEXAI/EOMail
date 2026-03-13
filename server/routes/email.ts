import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertEmailSchema, emails } from "@shared/schema";
import { requireAuth } from "../auth";
import { processEmail } from "../ai-pipeline";
import { sendEmail } from "../email";
import { resend } from "../resend-client";
import { emailContextIndex } from "../ai-context";
import { invalidateCache } from "../cache";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";

const VALID_FOLDERS = ["inbox", "starred", "sent", "drafts", "archive", "spam", "trash", "quarantine"];
const folderSchema = z.string().refine(
  (val) => VALID_FOLDERS.includes(val) || val.startsWith("custom:"),
  { message: "Invalid folder name" }
);

const emailUpdateSchema = z.object({
  read: z.boolean().optional(),
  starred: z.boolean().optional(),
  folder: folderSchema.optional(),
  labels: z.array(z.string()).optional(),
  to: z.string().optional(),
  toEmail: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  preview: z.string().optional(),
}).strict();

const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(["update", "delete"]),
  updates: z.object({
    read: z.boolean().optional(),
    starred: z.boolean().optional(),
    folder: folderSchema.optional(),
    labels: z.array(z.string()).optional(),
  }).strict().optional(),
});

export function registerEmailRoutes(app: Express): void {
  app.get("/api/emails", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const folder = (req.query.folder as string) || "inbox";
      const search = req.query.search as string | undefined;
      const label = req.query.label as string | undefined;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const offset = (page - 1) * limit;
      const emails = await storage.getEmails(userId, folder, search, label, limit, offset);
      res.json(emails);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/counts", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const [counts, finopsCount, calendarCount, securityCount] = await Promise.all([
        storage.getEmailCounts(userId),
        storage.getFinancialDocumentCount(userId, "extracted"),
        storage.getCalendarEventCount(userId),
        storage.getQuarantineActionCount(userId, "quarantined"),
      ]);
      counts.finops = finopsCount;
      counts.calendar = calendarCount;
      counts.security = securityCount;
      res.json(counts);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch counts" });
    }
  });

  app.get("/api/emails/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.id, userId);
      if (!email) return res.status(404).json({ error: "Email not found" });
      res.json(email);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch email" });
    }
  });

  app.post("/api/emails", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const body = { ...req.body, userId };
      if (typeof body.timestamp === "string") {
        body.timestamp = new Date(body.timestamp);
      }
      const parsed = insertEmailSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error });

      if (parsed.data.folder === "sent" && parsed.data.toEmail) {
        if (!(req.user as any).emailVerified) {
          return res.status(403).json({ error: "Please verify your email before sending messages" });
        }
        const senderMailbox = (req.user as any).mailboxAddress || req.user!.email;
        const result = await sendEmail({
          from: req.user!.displayName,
          fromEmail: senderMailbox,
          to: parsed.data.toEmail,
          subject: parsed.data.subject,
          html: parsed.data.body,
          cc: parsed.data.cc || undefined,
          bcc: parsed.data.bcc || undefined,
        });
        if (!result.success) {
          console.error("Email delivery failed:", result.error);
        }
      }

      const email = await storage.createEmail(parsed.data);
      emailContextIndex.invalidate(userId);
      invalidateCache(`briefing:${userId}`);
      res.status(201).json(email);
    } catch (e) {
      res.status(500).json({ error: "Failed to create email" });
    }
  });

  app.patch("/api/emails/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const parsed = emailUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid update fields", details: parsed.error.issues });
      const updated = await storage.updateEmail(req.params.id, userId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Email not found" });
      emailContextIndex.invalidate(userId);
      invalidateCache(`briefing:${userId}`);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.post("/api/emails/bulk", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const parsed = bulkActionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid bulk action", details: parsed.error.issues });
      const { ids, action, updates } = parsed.data;
      if (action === "delete") {
        const count = await storage.deleteEmails(ids, userId);
        emailContextIndex.invalidate(userId);
        invalidateCache(`briefing:${userId}`);
        return res.json({ deleted: count });
      }
      if (action === "update" && updates) {
        const results = await storage.updateEmails(ids.map(id => ({ id, values: updates })), userId);
        emailContextIndex.invalidate(userId);
        invalidateCache(`briefing:${userId}`);
        return res.json(results);
      }
      res.status(400).json({ error: "Invalid action" });
    } catch (e) {
      res.status(500).json({ error: "Failed to perform bulk action" });
    }
  });

  app.delete("/api/emails/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const deleted = await storage.deleteEmail(req.params.id, userId);
      if (!deleted) return res.status(404).json({ error: "Email not found" });
      emailContextIndex.invalidate(userId);
      invalidateCache(`briefing:${userId}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete email" });
    }
  });

  app.get("/api/emails/unread-count", requireAuth, async (req, res) => {
    try {
      const [result] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(emails)
        .where(and(
          eq(emails.userId, req.user!.id),
          eq(emails.read, false),
          eq(emails.folder, "inbox")
        ));
      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error("[Unread Count Error]", error);
      res.status(500).json({ error: "Failed to count unread emails" });
    }
  });

  // Resend inbound email webhook — uses Svix signature verification
  app.post("/api/email/inbound", async (req, res) => {
    try {
      const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
      if (!webhookSecret || !resend) {
        console.error("Inbound webhook: RESEND_WEBHOOK_SECRET or RESEND_API_KEY not configured");
        return res.status(503).json({ error: "Webhook not configured" });
      }

      // Svix verification requires raw body as string
      const rawBody = typeof req.rawBody === "string"
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? (req.rawBody as Buffer).toString()
          : JSON.stringify(req.body);

      const svixId = req.headers["svix-id"] as string | undefined;
      const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
      const svixSignature = req.headers["svix-signature"] as string | undefined;

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Inbound webhook: Missing Svix headers");
        return res.status(401).json({ error: "Missing webhook signature headers" });
      }

      let event;
      try {
        event = resend.webhooks.verify({
          payload: rawBody,
          headers: {
            id: svixId,
            timestamp: svixTimestamp,
            signature: svixSignature,
          },
          webhookSecret,
        });
      } catch (verifyErr) {
        console.error("Inbound webhook: Signature verification failed:", verifyErr);
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      // Only process email.received events
      if (event.type !== "email.received") {
        return res.json({ success: true, skipped: true, type: event.type });
      }

      const { email_id, to: toAddresses, from: senderRaw, subject, cc, bcc } = event.data as {
        email_id: string;
        to: string[];
        from: string;
        subject: string;
        cc: string[];
        bcc: string[];
      };

      // Fetch full email content (html, text) via Resend API
      const { data: fullEmail, error: fetchError } = await resend.emails.receiving.get(email_id);
      if (fetchError || !fullEmail) {
        console.error("Inbound webhook: Failed to fetch email content:", fetchError);
        return res.status(200).json({ success: false, error: "Failed to fetch email content" });
      }

      // Parse sender: "Name <email@domain.com>" or just "email@domain.com"
      const senderStr = fullEmail.from || senderRaw || "";
      const senderMatch = senderStr.match(/^(.+?)\s*<(.+)>$/);
      const senderName = senderMatch ? senderMatch[1].trim() : senderStr;
      const senderEmail = senderMatch ? senderMatch[2].trim() : senderStr;

      // Build body from html or escaped text
      const safeText = (fullEmail.text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const body = fullEmail.html || `<p>${safeText.replace(/\n/g, "</p><p>")}</p>`;
      const preview = (fullEmail.text || "").slice(0, 120);

      let processed = 0;
      const recipients = toAddresses || [];

      for (const recipientEmail of recipients) {
        if (!recipientEmail) continue;

        const user = await storage.getUserByMailbox(recipientEmail.toLowerCase());
        if (!user) continue;

        const email = await storage.createEmail({
          userId: user.id,
          from: senderName,
          fromEmail: senderEmail,
          to: user.displayName,
          toEmail: recipientEmail,
          cc: (cc || []).join(", "),
          bcc: (bcc || []).join(", "),
          subject: subject || "(no subject)",
          body,
          preview,
          timestamp: new Date(),
          read: false,
          starred: false,
          folder: "inbox",
          labels: [],
          attachments: fullEmail.attachments?.length || 0,
        });

        emailContextIndex.invalidate(user.id);
        invalidateCache(`briefing:${user.id}`);
        processEmail(email.id, user.id).catch((e) =>
          console.error("AI triage failed for inbound email:", e)
        );
        processed++;
      }

      console.log(`Inbound webhook: processed ${processed} recipients for email ${email_id}`);
      res.json({ success: true, processed });
    } catch (e) {
      console.error("Inbound webhook error:", e);
      // Return 200 to prevent Resend retries for unexpected errors
      res.status(200).json({ success: false, error: "Internal processing error" });
    }
  });
}
