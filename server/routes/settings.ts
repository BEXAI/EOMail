import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { getUserPreferences, setUserPreferences } from "../system-wrapper/context-manager";

const preferencesSchema = z.object({
  preferred_signature: z.string().max(500).optional(),
  default_tone: z.enum(["professional", "casual", "formal", "assertive"]).optional(),
  industry_jargon_toggle: z.boolean().optional(),
  formality_level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
}).strict();

export function registerSettingsRoutes(app: Express): void {
  app.get("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await getUserPreferences(req.user!.id);
      res.json(prefs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.post("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const parsed = preferencesSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid preferences", details: parsed.error.issues });
      const updated = await setUserPreferences(req.user!.id, parsed.data);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });
}
