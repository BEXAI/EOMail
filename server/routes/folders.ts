import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { type InsertEmail } from "@shared/schema";
import { requireAuth } from "../auth";
import { classifyEmail } from "../ai";
import { emailContextIndex } from "../ai-context";
import { invalidateCache } from "../cache";
import { aiLimiter } from "./_shared";

const createFolderSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  parentId: z.string().nullable().optional(),
  icon: z.string().max(20).optional().default("folder"),
  color: z.string().max(20).optional().default("blue"),
});

export function registerFolderRoutes(app: Express): void {
  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const folders = await storage.getCustomFolders(req.user!.id);
      res.json(folders);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch folders" });
    }
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
      const emailsToCreate: InsertEmail[] = [];
      const emailUpdates: { id: string, updates: { aiCategory: string, aiUrgency: string, aiSuggestedAction: string, aiProcessed: boolean } }[] = [];

      const emailSignatures = inboxEmails.map(e => `${e.subject}|${e.fromEmail}|${e.timestamp.toISOString()}`);
      const existingCopies = await storage.findDuplicateEmails(userId, emailSignatures);

      for (const email of inboxEmails) {
        const dedupKey = `${email.subject}|${email.fromEmail}|${email.timestamp.toISOString()}`;
        if (existingCopies.has(dedupKey)) {
          continue;
        }

        let category = email.aiCategory;
        if (!category) {
          try {
            const classification = await classifyEmail(email.from, email.subject, email.body);
            category = classification.category;
            emailUpdates.push({
              id: email.id,
              updates: {
                aiCategory: category,
                aiUrgency: classification.urgency,
                aiSuggestedAction: classification.suggestedAction,
                aiProcessed: true,
              }
            });
          } catch {
            category = "notification";
          }
        }

        const folderName = categoryMap[category] || "Other";
        const customFolderKey = `custom:${folderName}`;

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

        const { id: _id, ...emailWithoutId } = email;
        emailsToCreate.push({
          ...emailWithoutId,
          folder: customFolderKey,
          aiCategory: email.aiCategory || category,
        });

        folderStats[folderName] = (folderStats[folderName] || 0) + 1;
      }

      if (emailsToCreate.length > 0) {
        await storage.createEmails(emailsToCreate);
      }

      if (emailUpdates.length > 0) {
        await storage.updateEmails(emailUpdates.map(u => ({ id: u.id, values: u.updates })), userId);
      }

      const organized = emailsToCreate.length;
      const folderSummary = Object.entries(folderStats)
        .map(([name, count]) => `${name}: ${count}`)
        .join(", ");

      await storage.updateAgentActivity(activityRecord.id, userId, {
        status: "complete",
        detail: `Organized ${organized} emails into folders — ${folderSummary}`,
      });

      emailContextIndex.invalidate(userId);
      invalidateCache(`briefing:${userId}`);
      const createdFolders = await storage.getCustomFolders(userId);
      res.json({ success: true, organized, folders: createdFolders, stats: folderStats });
    } catch (e) {
      console.error("Auto-organize error:", e);
      res.status(500).json({ error: "Failed to auto-organize emails" });
    }
  });
}
