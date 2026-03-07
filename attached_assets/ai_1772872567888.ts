/**
 * EOMail.co — AI Service Layer (System Wrapper v2)
 * DROP-IN REPLACEMENT for the original server/ai.ts
 *
 * Routes all LLM calls through the System Wrapper Architecture:
 *   Context Manager → Prompt Orchestrator → API Gateway → Security Layer
 *
 * To use: copy this file to server/ai.ts in your Replit project.
 * All existing import statements in routes.ts and ai-pipeline.ts
 * will continue to work — no other files need changes.
 */

import type { Email } from "@shared/schema";
import {
  buildEmailContext,
  getUserPreferences,
  stripHtml,
} from "./system-wrapper/context-manager";
import {
  buildSmartReplyPrompt,
  buildThreadSummarizerPrompt,
  buildClassifyPrompt,
  buildSpamAnalysisPrompt,
  buildMorningBriefingPrompt,
  buildAiCommandPrompt,
  buildDraftExpanderPrompt,
} from "./system-wrapper/prompt-orchestrator";
import {
  executePrompt,
  executeJsonPrompt,
} from "./system-wrapper/api-gateway";

// ─── Guard: Require real API key at startup ────────────────────────────────────

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "[EOMail AI] CRITICAL: OPENAI_API_KEY is not set in Replit Secrets.\n" +
      "All AI features will fail. Add OPENAI_API_KEY in Replit → Secrets (padlock icon)."
  );
}

// ─── summarizeEmail ────────────────────────────────────────────────────────────

export async function summarizeEmail(
  subject: string,
  body: string
): Promise<string> {
  try {
    const plainBody = stripHtml(body).slice(0, 2000);
    const prompt = buildThreadSummarizerPrompt({
      email_thread_context: `Subject: ${subject}\n\n${plainBody}`,
    });
    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[summarizeEmail] Failed:", error);
    return "Unable to generate summary.";
  }
}

// ─── classifyEmail ────────────────────────────────────────────────────────────

export async function classifyEmail(
  from: string,
  subject: string,
  body: string
): Promise<{ category: string; urgency: string; suggestedAction: string }> {
  try {
    const plainBody = stripHtml(body).slice(0, 1500);
    const prompt = buildClassifyPrompt({
      from,
      subject,
      body_preview: plainBody,
    });

    const result = await executeJsonPrompt<{
      category: string;
      urgency: string;
      suggestedAction: string;
    }>(prompt);

    return {
      category: result.category || "notification",
      urgency: result.urgency || "low",
      suggestedAction: result.suggestedAction || "review",
    };
  } catch (error) {
    console.error("[classifyEmail] Failed:", error);
    return { category: "notification", urgency: "low", suggestedAction: "review" };
  }
}

// ─── draftReply ────────────────────────────────────────────────────────────────

export async function draftReply(
  originalEmail: Email,
  userDisplayName: string,
  tone?: string
): Promise<string> {
  try {
    // Load user preferences for this user (userId not available here, use display name as key)
    const prefs = getUserPreferences(userDisplayName);

    // Override tone if explicitly passed (from tone micro-prompts UI)
    const effectiveTone = (tone as typeof prefs.default_tone) || prefs.default_tone;

    const emailContext = buildEmailContext(originalEmail, userDisplayName);

    const prompt = buildSmartReplyPrompt({
      email_thread_context: emailContext,
      user_intent: "Reply professionally addressing the key points in this email.",
      user_tone: effectiveTone,
      user_name: userDisplayName,
      preferred_signature: prefs.preferred_signature,
      industry_jargon_toggle: prefs.industry_jargon_toggle,
    });

    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[draftReply] Failed:", error);
    return "Unable to draft reply.";
  }
}

// ─── generateBriefing ─────────────────────────────────────────────────────────

export async function generateBriefing(
  recentEmails: Email[],
  agentSummary?: string
): Promise<string> {
  try {
    // Build a compact thread summary of up to 20 recent emails
    const emailLines = recentEmails.slice(0, 20).map((e, i) => {
      const status = e.read ? "read" : "unread";
      const ai = e.aiProcessed
        ? ` [AI: ${e.aiCategory || "uncategorized"}, urgency: ${e.aiUrgency || "unknown"}]`
        : "";
      return `${i + 1}. [${status}] From: ${e.from} — "${e.subject}"${ai}`;
    });

    const prompt = buildMorningBriefingPrompt({
      email_thread_context: emailLines.join("\n"),
      agent_activity_summary: agentSummary,
      // We don't have the user's display name here; use a generic fallback
      user_name: "the user",
    });

    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[generateBriefing] Failed:", error);
    return "No briefing available.";
  }
}

// ─── analyzeSpamRisk ──────────────────────────────────────────────────────────

export async function analyzeSpamRisk(
  from: string,
  fromEmail: string,
  subject: string,
  body: string
): Promise<{
  score: number;
  reason: string;
  threatType: string;
  impersonationProbability: number;
}> {
  try {
    const plainBody = stripHtml(body).slice(0, 1500);
    const prompt = buildSpamAnalysisPrompt({
      from_name: from,
      from_email: fromEmail,
      subject,
      body_preview: plainBody,
    });

    const result = await executeJsonPrompt<{
      score: number;
      reason: string;
      threatType: string;
      impersonationProbability: number;
    }>(prompt);

    return {
      score: Math.min(100, Math.max(0, parseInt(String(result.score)) || 0)),
      reason: result.reason || "Unable to assess risk.",
      threatType: result.threatType || "legitimate",
      impersonationProbability: Math.min(
        100,
        Math.max(0, parseInt(String(result.impersonationProbability)) || 0)
      ),
    };
  } catch (error) {
    console.error("[analyzeSpamRisk] Failed:", error);
    return {
      score: 0,
      reason: "Unable to assess risk.",
      threatType: "legitimate",
      impersonationProbability: 0,
    };
  }
}

// ─── handleAiCommand ──────────────────────────────────────────────────────────

export async function handleAiCommand(
  userCommand: string,
  recentEmails: Email[]
): Promise<string> {
  try {
    const emailLines = recentEmails.slice(0, 15).map((e, i) => {
      const status = e.read ? "read" : "unread";
      const summary = e.aiSummary || e.preview;
      const agent =
        e.aiCategory === "finance"
          ? "[FinOps]"
          : e.aiCategory === "scheduling"
          ? "[Chrono]"
          : "";
      return `${i + 1}. [${status}${e.starred ? ", starred" : ""}] ${agent} From: ${e.from} — "${e.subject}" | ${summary}`;
    });

    const prompt = buildAiCommandPrompt({
      user_command: userCommand,
      email_thread_context: emailLines.join("\n"),
      user_name: "the user",
    });

    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[handleAiCommand] Failed:", error);
    return "I couldn't process that command.";
  }
}

// ─── expandDraft (new function — not in original ai.ts) ───────────────────────
// Expose this via a new API route: POST /api/ai/expand-draft

export async function expandDraft(
  shorthandNotes: string,
  recipientName: string,
  recipientCompany: string | undefined,
  userDisplayName: string,
  relationship: "client" | "colleague" | "vendor" | "unknown" = "unknown"
): Promise<string> {
  try {
    const prefs = getUserPreferences(userDisplayName);
    const prompt = buildDraftExpanderPrompt({
      shorthand_notes: shorthandNotes,
      recipient_metadata: {
        name: recipientName,
        company: recipientCompany,
        relationship,
      },
      user_name: userDisplayName,
      preferred_signature: prefs.preferred_signature,
      formality_level: prefs.formality_level,
    });

    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[expandDraft] Failed:", error);
    return "Unable to expand draft.";
  }
}
