import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";

export function registerThreadRoutes(app: Express): void {
  app.get("/api/threads/:threadId", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const threadEmails = await storage.getEmailThread(req.params.threadId, userId);
      const summary = await storage.getThreadSummary(req.params.threadId, userId);
      res.json({ emails: threadEmails, summary });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });
}
