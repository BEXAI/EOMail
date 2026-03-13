import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { draftReply, expandDraft } from "../ai";
import { sendEmail } from "../email";
import { emailContextIndex } from "../ai-context";
import { invalidateCache } from "../cache";
import { escapeHtml } from "./_shared";

export function registerComposeRoutes(app: Express): void {
  app.post("/api/ai/draft-reply/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.id, userId);
      if (!email) return res.status(404).json({ error: "Email not found" });
      const tone = req.body?.tone as string | undefined;
      const draft = await draftReply(email, req.user!.displayName, tone, userId);
      const updated = await storage.updateEmail(req.params.id, userId, { aiDraftReply: draft });
      invalidateCache(`briefing:${userId}`);
      res.json(updated);
    } catch (e) {
      console.error("AI draft-reply error:", e);
      res.status(500).json({ error: "Failed to generate draft reply" });
    }
  });

  app.post("/api/ai/approve/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.id, userId);
      if (!email) return res.status(404).json({ error: "Email not found" });
      if (!email.aiDraftReply) return res.status(400).json({ error: "No draft reply to approve" });

      const now = new Date();
      const replyBody = `<p>${escapeHtml(email.aiDraftReply).replace(/\n/g, "</p><p>")}</p>`;
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
      invalidateCache(`briefing:${userId}`);
      res.json({ success: true, email: updated });
    } catch (e) {
      console.error("AI approve error:", e);
      res.status(500).json({ error: "Failed to approve and send" });
    }
  });

  app.post("/api/ai/reject/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const paramsSchema = z.object({ id: z.string().min(1) });
      const parsed = paramsSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid email ID" });
      }

      const updated = await storage.updateEmail(parsed.data.id, userId, { aiDraftReply: null });
      if (!updated) return res.status(404).json({ error: "Email not found" });
      emailContextIndex.invalidate(userId);
      invalidateCache(`briefing:${userId}`);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to reject draft" });
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
        relationship || "unknown",
        user.id
      );

      res.json({ draft: expanded });
    } catch (e) {
      res.status(500).json({ error: "Failed to expand draft" });
    }
  });
}
