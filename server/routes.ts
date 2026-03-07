import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertEmailSchema } from "@shared/schema";
import { requireAuth } from "./auth";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
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
      const updated = await storage.updateEmail(req.params.id, userId, req.body);
      if (!updated) return res.status(404).json({ error: "Email not found" });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.post("/api/emails/bulk", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { ids, action, updates } = req.body as {
        ids: string[];
        action: "update" | "delete";
        updates?: Partial<any>;
      };
      if (!ids || !Array.isArray(ids) || !action) {
        return res.status(400).json({ error: "ids and action required" });
      }
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

  return httpServer;
}
