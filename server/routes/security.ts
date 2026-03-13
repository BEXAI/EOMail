import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { emailContextIndex } from "../ai-context";
import { apiError } from "./_shared";

export function registerSecurityRoutes(app: Express): void {
  app.get("/api/security/quarantine", requireAuth, async (req, res) => {
    try {
      const actions = await storage.getQuarantineActions(req.user!.id);
      res.json(actions);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch quarantine actions" });
    }
  });

  app.post("/api/security/quarantine/:emailId/release", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { emailId } = req.params;
      const action = await storage.getQuarantineAction(emailId, userId);
      if (!action) return res.status(404).json({ error: "Quarantine record not found" });

      await storage.updateQuarantineAction(action.id, userId, {
        releaseStatus: "released",
        reviewedAt: new Date(),
      });
      await storage.updateEmail(emailId, userId, { folder: "inbox" });
      emailContextIndex.invalidate(userId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to release email" });
    }
  });

  app.get("/api/security/scan-logs/:emailId", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const email = await storage.getEmail(req.params.emailId, userId);
      if (!email) return apiError(res, 404, "NOT_FOUND", "Email not found");
      const logs = await storage.getThreatScanLogs(req.params.emailId, userId);
      res.json(logs);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch scan logs");
    }
  });
}
