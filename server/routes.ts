import type { Express } from "express";
import { type Server } from "http";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage";
import { insertEmailSchema } from "@shared/schema";
import { requireAuth } from "./auth";
import { processEmail, processAllUnprocessed } from "./ai-pipeline";
import { draftReply, generateBriefing, handleAiCommand } from "./ai";

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
      const email = await storage.createEmail(parsed.data);
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
        return res.json({ deleted: count });
      }
      if (action === "update" && updates) {
        const results = await storage.updateEmails(ids, userId, updates);
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
      const recentEmails = await storage.getEmails(userId, "all");
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

      const briefing = await generateBriefing(recentEmails, agentSummary);

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
      const recentEmails = await storage.getEmails(userId, "all");
      const response = await handleAiCommand(prompt, recentEmails);
      res.json({ response });
    } catch (e) {
      console.error("AI command error:", e);
      res.status(500).json({ error: "Failed to process AI command" });
    }
  });

  app.post("/api/ai/approve/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.id, userId);
      if (!email) return res.status(404).json({ error: "Email not found" });
      if (!email.aiDraftReply) return res.status(400).json({ error: "No draft reply to approve" });

      const now = new Date();
      await storage.createEmail({
        userId,
        from: req.user!.displayName,
        fromEmail: req.user!.email,
        to: email.from,
        toEmail: email.fromEmail,
        cc: "",
        bcc: "",
        subject: `Re: ${email.subject}`,
        body: `<p>${email.aiDraftReply.replace(/\n/g, "</p><p>")}</p>`,
        preview: email.aiDraftReply.slice(0, 120),
        timestamp: now,
        read: true,
        starred: false,
        folder: "sent",
        labels: [],
        attachments: 0,
      });

      const updated = await storage.updateEmail(req.params.id, userId, { aiDraftReply: null });
      res.json({ success: true, email: updated });
    } catch (e) {
      console.error("AI approve error:", e);
      res.status(500).json({ error: "Failed to approve and send" });
    }
  });

  app.post("/api/ai/reject/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updated = await storage.updateEmail(req.params.id, userId, { aiDraftReply: null });
      if (!updated) return res.status(404).json({ error: "Email not found" });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to reject draft" });
    }
  });

  return httpServer;
}
