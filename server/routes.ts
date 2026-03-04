import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmailSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/emails", async (req, res) => {
    try {
      const folder = (req.query.folder as string) || "inbox";
      const search = req.query.search as string | undefined;
      const emails = await storage.getEmails(folder, search);
      res.json(emails);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/counts", async (req, res) => {
    try {
      const counts = await storage.getEmailCounts();
      res.json(counts);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch counts" });
    }
  });

  app.get("/api/emails/:id", async (req, res) => {
    try {
      const email = await storage.getEmail(req.params.id);
      if (!email) return res.status(404).json({ error: "Email not found" });
      res.json(email);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch email" });
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const body = { ...req.body };
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

  app.patch("/api/emails/:id", async (req, res) => {
    try {
      const updated = await storage.updateEmail(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Email not found" });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.delete("/api/emails/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmail(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Email not found" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete email" });
    }
  });

  return httpServer;
}
