import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { processEmail, processAllUnprocessed, processThreadDigests } from "../ai-pipeline";
import { generateBriefing, handleAiCommand, handleAiChat, type ChatMessage } from "../ai";
import { emailContextIndex } from "../ai-context";
import { getCache, setCache, invalidateCache } from "../cache";
import { apiError, aiLimiter } from "./_shared";

function isAiBillingError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("credit balance") || msg.includes("billing") || msg.includes("purchase credits");
}

function aiErrorResponse(res: any, e: unknown, fallbackMsg: string) {
  const errMsg = e instanceof Error ? e.message : String(e);
  if (isAiBillingError(e)) {
    return res.status(503).json({ error: "AI service temporarily unavailable", code: "AI_BILLING" });
  }
  if (errMsg.includes("API key")) {
    return res.status(503).json({ error: "AI service not configured", code: "AI_NOT_CONFIGURED" });
  }
  return res.status(500).json({ error: fallbackMsg });
}

export function registerAiRoutes(app: Express): void {
  app.post("/api/ai/process/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userDisplayName = req.user!.displayName;
      const result = await processEmail(req.params.id, userId, userDisplayName);
      if (!result) return res.status(404).json({ error: "Email not found" });
      invalidateCache(`briefing:${userId}`);
      res.json(result);
    } catch (e) {
      console.error("AI process error:", e);
      aiErrorResponse(res, e, "Failed to process email with AI");
    }
  });

  app.post("/api/ai/process-all", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userDisplayName = req.user!.displayName;
      const count = await processAllUnprocessed(userId, userDisplayName);
      const threadCount = await processThreadDigests(userId);
      invalidateCache(`briefing:${userId}`);
      res.json({ processed: count, threadsDigested: threadCount });
    } catch (e) {
      console.error("AI process-all error:", e);
      aiErrorResponse(res, e, "Failed to process emails with AI");
    }
  });

  app.get("/api/ai/briefing", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const cacheKey = `briefing:${userId}`;
      const cached = getCache<{ briefing: string, agentStats: any[] }>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

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

      const result = { briefing, agentStats };
      setCache(cacheKey, result, 5 * 60 * 1000);

      res.json(result);
    } catch (e) {
      console.error("AI briefing error:", e);
      aiErrorResponse(res, e, "Failed to generate briefing");
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
      aiErrorResponse(res, e, "Failed to process AI command");
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
      const emailId = req.body.emailId as string | undefined;
      const { context: emailContext, count: emailCount } = await emailContextIndex.getContextWithCount(userId);
      const response = await handleAiChat(validated, emailContext, emailCount);

      const lastUserMsg = validated[validated.length - 1];
      if (lastUserMsg) {
        storage.createChatMessage({ userId, emailId, role: lastUserMsg.role, content: lastUserMsg.content }).catch(() => {});
      }
      storage.createChatMessage({ userId, emailId, role: "assistant", content: response }).catch(() => {});

      res.json({ response });
    } catch (e) {
      console.error("AI chat error:", e);
      aiErrorResponse(res, e, "Failed to process chat message");
    }
  });

  app.get("/api/ai/chat/history", requireAuth, async (req, res) => {
    try {
      const emailId = req.query.emailId as string | undefined;
      const history = await storage.getChatHistory(req.user!.id, emailId);
      res.json(history);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to fetch chat history");
    }
  });

  app.delete("/api/ai/chat/history", requireAuth, async (req, res) => {
    try {
      const emailId = req.query.emailId as string | undefined;
      await storage.deleteChatHistory(req.user!.id, emailId);
      res.json({ success: true });
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to delete chat history");
    }
  });

}
