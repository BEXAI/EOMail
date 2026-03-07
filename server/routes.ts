import type { Express } from "express";
import { type Server } from "http";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage";
import { insertEmailSchema, type InsertEmail } from "@shared/schema";
import { requireAuth } from "./auth";
import { processEmail, processAllUnprocessed } from "./ai-pipeline";
import { draftReply, generateBriefing, handleAiCommand, handleAiChat, classifyEmail, expandDraft, type ChatMessage } from "./ai";
import { sendEmail } from "./email";
import { emailContextIndex } from "./ai-context";
import { getUserPreferences, setUserPreferences } from "./system-wrapper/context-manager";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: "AI request limit reached. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailUpdateSchema = z.object({
  read: z.boolean().optional(),
  starred: z.boolean().optional(),
  folder: z.string().optional(),
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
    folder: z.string().optional(),
    labels: z.array(z.string()).optional(),
  }).strict().optional(),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use("/api/", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/ai/", aiLimiter);
  app.get("/api/emails", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const folder = (req.query.folder as string) || "inbox";
      const search = req.query.search as string | undefined;
      const label = req.query.label as string | undefined;
      const emails = await storage.getEmails(userId, folder, search, label);
      res.json(emails);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/counts", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const counts = await storage.getEmailCounts(userId);
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
        return res.json({ deleted: count });
      }
      if (action === "update" && updates) {
        const results = await storage.updateEmails(ids, userId, updates);
        emailContextIndex.invalidate(userId);
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
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete email" });
    }
  });

  app.post("/api/ai/process/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userDisplayName = req.user!.displayName;
      const result = await processEmail(req.params.id, userId, userDisplayName);
      if (!result) return res.status(404).json({ error: "Email not found" });
      res.json(result);
    } catch (e) {
      console.error("AI process error:", e);
      res.status(500).json({ error: "Failed to process email with AI" });
    }
  });

  app.post("/api/ai/process-all", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userDisplayName = req.user!.displayName;
      const count = await processAllUnprocessed(userId, userDisplayName);
      res.json({ processed: count });
    } catch (e) {
      console.error("AI process-all error:", e);
      res.status(500).json({ error: "Failed to process emails with AI" });
    }
  });

  app.post("/api/ai/draft-reply/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.id, userId);
      if (!email) return res.status(404).json({ error: "Email not found" });
      const tone = req.body?.tone as string | undefined;
      const draft = await draftReply(email, req.user!.displayName, tone);
      const updated = await storage.updateEmail(req.params.id, userId, { aiDraftReply: draft });
      res.json(updated);
    } catch (e) {
      console.error("AI draft-reply error:", e);
      res.status(500).json({ error: "Failed to generate draft reply" });
    }
  });

  app.get("/api/ai/briefing", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const emailContext = await emailContextIndex.getContext(userId);
      const activities = await storage.getAgentActivity(userId);

      const agentCounts: Record<string, { complete: number; pending: number }> = {};
      for (const a of activities) {
        const name = a.agentName || "EOMail Assistant";
        if (!agentCounts[name]) agentCounts[name] = { complete: 0, pending: 0 };
        if (a.status === "complete") agentCounts[name].complete++;
        else if (a.status === "pending") agentCounts[name].pending++;
      }

      const summaryParts = Object.entries(agentCounts)
        .filter(([, c]) => c.complete > 0)
        .map(([name, c]) => `${name}: ${c.complete} tasks completed`);
      const agentSummary = summaryParts.length > 0 ? summaryParts.join("; ") : undefined;

      const briefing = await generateBriefing(emailContext, agentSummary);

      const agentStats = Object.entries(agentCounts).map(([name, c]) => ({
        name,
        completed: c.complete,
        pending: c.pending,
      }));

      res.json({ briefing, agentStats });
    } catch (e) {
      console.error("AI briefing error:", e);
      res.status(500).json({ error: "Failed to generate briefing" });
    }
  });

  app.get("/api/ai/activity", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const activity = await storage.getAgentActivity(userId);
      res.json(activity);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch agent activity" });
    }
  });

  app.post("/api/ai/command", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "prompt is required" });
      if (typeof prompt !== "string" || prompt.length > 500) return res.status(400).json({ error: "prompt must be a string of 500 characters or less" });
      const emailContext = await emailContextIndex.getContext(userId);
      const response = await handleAiCommand(prompt, emailContext);
      res.json({ response });
    } catch (e) {
      console.error("AI command error:", e);
      res.status(500).json({ error: "Failed to process AI command" });
    }
  });

  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages array is required" });
      }
      if (messages.length > 50) {
        return res.status(400).json({ error: "Too many messages in conversation" });
      }
      const validRoles = new Set(["user", "assistant"]);
      const validated: ChatMessage[] = [];
      for (const msg of messages) {
        if (!msg || typeof msg.content !== "string" || !validRoles.has(msg.role)) {
          return res.status(400).json({ error: "Each message must have a valid role and content" });
        }
        validated.push({ role: msg.role, content: msg.content.slice(0, 2000) });
      }
      const emailContext = await emailContextIndex.getContext(userId);
      const response = await handleAiChat(validated, emailContext);
      res.json({ response });
    } catch (e) {
      console.error("AI chat error:", e);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.post("/api/ai/approve/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.id, userId);
      if (!email) return res.status(404).json({ error: "Email not found" });
      if (!email.aiDraftReply) return res.status(400).json({ error: "No draft reply to approve" });

      const now = new Date();
      const replyBody = `<p>${email.aiDraftReply.replace(/\n/g, "</p><p>")}</p>`;
      const replySubject = `Re: ${email.subject}`;

      const senderMailbox = (req.user as any).mailboxAddress || req.user!.email;
      const mailResult = await sendEmail({
        from: req.user!.displayName,
        fromEmail: senderMailbox,
        to: email.fromEmail,
        subject: replySubject,
        html: replyBody,
      });
      if (!mailResult.success) {
        console.error("Reply delivery failed:", mailResult.error);
      }

      await storage.createEmail({
        userId,
        from: req.user!.displayName,
        fromEmail: req.user!.email,
        to: email.from,
        toEmail: email.fromEmail,
        cc: "",
        bcc: "",
        subject: replySubject,
        body: replyBody,
        preview: email.aiDraftReply.slice(0, 120),
        timestamp: now,
        read: true,
        starred: false,
        folder: "sent",
        labels: [],
        attachments: 0,
      });

      const updated = await storage.updateEmail(req.params.id, userId, { aiDraftReply: null });
      emailContextIndex.invalidate(userId);
      res.json({ success: true, email: updated });
    } catch (e) {
      console.error("AI approve error:", e);
      res.status(500).json({ error: "Failed to approve and send" });
    }
  });

  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const folders = await storage.getCustomFolders(req.user!.id);
      res.json(folders);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  const createFolderSchema = z.object({
    name: z.string().min(1).max(50).trim(),
    parentId: z.string().nullable().optional(),
    icon: z.string().max(20).optional().default("folder"),
    color: z.string().max(20).optional().default("blue"),
  });

  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      const parsed = createFolderSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error });

      const { name, parentId, icon, color } = parsed.data;

      const existing = await storage.getCustomFolderByName(req.user!.id, name, parentId || null);
      if (existing) {
        return res.json(existing);
      }

      const folder = await storage.createCustomFolder({
        userId: req.user!.id,
        name,
        parentId: parentId || null,
        icon,
        color,
      });
      res.status(201).json(folder);
    } catch (e) {
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomFolder(req.params.id, req.user!.id);
      if (!deleted) return res.status(404).json({ error: "Folder not found" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  app.post("/api/ai/auto-organize", requireAuth, aiLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;

      const activityRecord = await storage.createAgentActivity({
        userId,
        agentName: "EOMail Assistant",
        action: "Auto-organizing inbox into folders",
        status: "pending",
        emailId: null,
        detail: null,
      });

      const inboxEmails = await storage.getEmails(userId, "inbox");
      if (inboxEmails.length === 0) {
        await storage.updateAgentActivity(activityRecord.id, userId, {
          status: "complete",
          detail: "No emails in inbox to organize",
        });
        return res.json({ success: true, organized: 0, folders: [] });
      }

      const categoryMap: Record<string, string> = {
        finance: "Finance",
        scheduling: "Scheduling",
        newsletter: "Newsletters",
        "action-required": "Action Required",
        social: "Social",
        notification: "Notifications",
      };

      const folderStats: Record<string, number> = {};
      let organized = 0;

      const allCustomEmails = await Promise.all(
        Object.values(categoryMap).map((name) =>
          storage.getEmails(userId, `custom:${name}`)
        )
      );
      const existingCopies = new Set<string>();
      for (const emailList of allCustomEmails) {
        for (const e of emailList) {
          existingCopies.add(`${e.subject}|${e.fromEmail}|${e.timestamp.toISOString()}`);
        }
      }

      for (const email of inboxEmails) {
        let category = email.aiCategory;

        if (!category) {
          try {
            const classification = await classifyEmail(email.from, email.subject, email.body);
            category = classification.category;
            await storage.updateEmail(email.id, userId, {
              aiCategory: category,
              aiUrgency: classification.urgency,
              aiSuggestedAction: classification.suggestedAction,
              aiProcessed: true,
            });
          } catch {
            category = "notification";
          }
        }

        const folderName = categoryMap[category] || "Other";
        const customFolderKey = `custom:${folderName}`;

        const dedupKey = `${email.subject}|${email.fromEmail}|${email.timestamp.toISOString()}`;
        if (existingCopies.has(dedupKey)) {
          continue;
        }

        let existingFolder = await storage.getCustomFolderByName(userId, folderName, null);
        if (!existingFolder) {
          const colorMap: Record<string, string> = {
            Finance: "emerald",
            Scheduling: "blue",
            Newsletters: "purple",
            "Action Required": "rose",
            Social: "amber",
            Notifications: "slate",
            Other: "gray",
          };
          existingFolder = await storage.createCustomFolder({
            userId,
            name: folderName,
            parentId: null,
            icon: "folder",
            color: colorMap[folderName] || "blue",
          });
        }

        await storage.createEmail({
          userId,
          from: email.from,
          fromEmail: email.fromEmail,
          to: email.to,
          toEmail: email.toEmail,
          cc: email.cc,
          bcc: email.bcc,
          subject: email.subject,
          body: email.body,
          preview: email.preview,
          timestamp: email.timestamp,
          read: email.read,
          starred: email.starred,
          folder: customFolderKey,
          labels: email.labels,
          attachments: email.attachments,
          aiSummary: email.aiSummary,
          aiCategory: email.aiCategory || category,
          aiUrgency: email.aiUrgency,
          aiSuggestedAction: email.aiSuggestedAction,
          aiDraftReply: email.aiDraftReply,
          aiSpamScore: email.aiSpamScore,
          aiSpamReason: email.aiSpamReason,
          aiProcessed: true,
        } as InsertEmail);

        existingCopies.add(dedupKey);
        folderStats[folderName] = (folderStats[folderName] || 0) + 1;
        organized++;
      }

      const folderSummary = Object.entries(folderStats)
        .map(([name, count]) => `${name}: ${count}`)
        .join(", ");

      await storage.updateAgentActivity(activityRecord.id, userId, {
        status: "complete",
        detail: `Organized ${organized} emails into folders — ${folderSummary}`,
      });

      emailContextIndex.invalidate(userId);
      const createdFolders = await storage.getCustomFolders(userId);
      res.json({ success: true, organized, folders: createdFolders, stats: folderStats });
    } catch (e) {
      console.error("Auto-organize error:", e);
      res.status(500).json({ error: "Failed to auto-organize emails" });
    }
  });

  app.post("/api/ai/reject/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updated = await storage.updateEmail(req.params.id, userId, { aiDraftReply: null });
      if (!updated) return res.status(404).json({ error: "Email not found" });
      emailContextIndex.invalidate(userId);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to reject draft" });
    }
  });

  app.post("/api/email/inbound", async (req, res) => {
    try {
      const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
      if (webhookSecret) {
        const providedSecret = req.headers["x-webhook-secret"] || req.query.secret;
        if (providedSecret !== webhookSecret) {
          return res.status(401).json({ error: "Unauthorized webhook request" });
        }
      }

      const { from, from_email, to, subject, html, text: textBody } = req.body;
      if (!to || !from_email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const recipients = Array.isArray(to) ? to : [to];
      let processed = 0;

      for (const recipient of recipients) {
        const recipientEmail = typeof recipient === "string" ? recipient : recipient.email;
        if (!recipientEmail) continue;

        const user = await storage.getUserByMailbox(recipientEmail.toLowerCase());
        if (!user) continue;

        const senderName = typeof from === "string" ? from : (from?.name || from_email);
        const body = html || `<p>${(textBody || "").replace(/\n/g, "</p><p>")}</p>`;
        const preview = (textBody || "").slice(0, 120);

        const email = await storage.createEmail({
          userId: user.id,
          from: senderName,
          fromEmail: from_email,
          to: user.displayName,
          toEmail: recipientEmail,
          cc: "",
          bcc: "",
          subject: subject || "(no subject)",
          body,
          preview,
          timestamp: new Date(),
          read: false,
          starred: false,
          folder: "inbox",
          labels: [],
          attachments: 0,
        });

        emailContextIndex.invalidate(user.id);
        processEmail(email.id, user.id).catch((e) =>
          console.error("AI triage failed for inbound email:", e)
        );
        processed++;
      }

      res.json({ success: true, processed });
    } catch (e) {
      console.error("Inbound webhook error:", e);
      res.status(500).json({ error: "Failed to process inbound email" });
    }
  });

  app.post("/api/ai/expand-draft", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const { notes, recipientName, recipientCompany, relationship } = req.body as {
        notes: string;
        recipientName: string;
        recipientCompany?: string;
        relationship?: "client" | "colleague" | "vendor" | "unknown";
      };

      if (!notes || !recipientName) {
        return res.status(400).json({ error: "notes and recipientName are required" });
      }
      if (typeof notes !== "string" || notes.length > 2000) {
        return res.status(400).json({ error: "notes must be a string of 2000 characters or less" });
      }
      if (typeof recipientName !== "string" || recipientName.length > 100) {
        return res.status(400).json({ error: "recipientName must be a string of 100 characters or less" });
      }

      const expanded = await expandDraft(
        notes,
        recipientName,
        recipientCompany,
        user.displayName,
        relationship || "unknown"
      );

      res.json({ draft: expanded });
    } catch (e) {
      res.status(500).json({ error: "Failed to expand draft" });
    }
  });

  app.get("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = getUserPreferences(req.user!.id);
      res.json(prefs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  const preferencesSchema = z.object({
    preferred_signature: z.string().max(500).optional(),
    default_tone: z.enum(["professional", "casual", "formal", "assertive"]).optional(),
    industry_jargon_toggle: z.boolean().optional(),
    formality_level: z.number().int().min(1).max(5).optional(),
  }).strict();

  app.post("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const parsed = preferencesSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid preferences", details: parsed.error.issues });
      const updated = setUserPreferences(req.user!.id, parsed.data);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  return httpServer;
}
