/**
 * EOMail.co — New API Routes for System Wrapper v2
 * 
 * ADD THESE ROUTES to your existing server/routes.ts file.
 * Paste them inside the registerRoutes() function, before the closing return statement.
 *
 * New endpoints added by the System Wrapper:
 *   POST /api/ai/expand-draft       — Expand shorthand notes into full email
 *   POST /api/user/preferences      — Save user AI preferences
 *   GET  /api/user/preferences      — Get user AI preferences
 */

import { expandDraft } from "./ai";
import { getUserPreferences, setUserPreferences } from "./system-wrapper/context-manager";

// ─── POST /api/ai/expand-draft ────────────────────────────────────────────────
// Turns shorthand bullet points into a full professional email.
// Example body: { notes: "meeting next week, discuss Q3, bring slides", recipientName: "Sarah" }

app.post("/api/ai/expand-draft", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const {
      notes,
      recipientName,
      recipientCompany,
      relationship,
    } = req.body as {
      notes: string;
      recipientName: string;
      recipientCompany?: string;
      relationship?: "client" | "colleague" | "vendor" | "unknown";
    };

    if (!notes || !recipientName) {
      return res.status(400).json({ error: "notes and recipientName are required" });
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

// ─── GET /api/user/preferences ────────────────────────────────────────────────
// Returns current AI behavior preferences for the logged-in user.

app.get("/api/user/preferences", requireAuth, async (req, res) => {
  try {
    const prefs = getUserPreferences(req.user!.id);
    res.json(prefs);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// ─── POST /api/user/preferences ───────────────────────────────────────────────
// Updates one or more AI behavior preferences.
// Example body: { default_tone: "casual", formality_level: 2 }

app.post("/api/user/preferences", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      preferred_signature,
      default_tone,
      industry_jargon_toggle,
      formality_level,
    } = req.body;

    const updated = setUserPreferences(userId, {
      ...(preferred_signature !== undefined && { preferred_signature }),
      ...(default_tone !== undefined && { default_tone }),
      ...(industry_jargon_toggle !== undefined && { industry_jargon_toggle }),
      ...(formality_level !== undefined && { formality_level }),
    });

    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});
