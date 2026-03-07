import type { Email } from "@shared/schema";
import {
  buildEmailContext,
  getUserPreferences,
  stripHtml,
} from "./system-wrapper/context-manager";
import {
  buildSmartReplyPrompt,
  buildSummarizeEmailPrompt,
  buildClassifyPrompt,
  buildSpamAnalysisPrompt,
  buildMorningBriefingPrompt,
  buildAiCommandPrompt,
  buildDraftExpanderPrompt,
  buildAiChatSystemPrompt,
} from "./system-wrapper/prompt-orchestrator";
import {
  executePrompt,
  executeJsonPrompt,
  executeMultiTurnChat,
} from "./system-wrapper/api-gateway";

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "[EOMail AI] CRITICAL: OPENAI_API_KEY is not set.\n" +
      "All AI features will fail. Add OPENAI_API_KEY in Secrets."
  );
}

export async function summarizeEmail(
  subject: string,
  body: string
): Promise<string> {
  try {
    const plainBody = stripHtml(body).slice(0, 2000);
    const prompt = buildSummarizeEmailPrompt({
      subject,
      body_plain: plainBody,
    });
    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[summarizeEmail] Failed:", error);
    return "Unable to generate summary.";
  }
}

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

export async function draftReply(
  originalEmail: Email,
  userDisplayName: string,
  tone?: string,
  userId?: string
): Promise<string> {
  try {
    const prefsKey = userId || userDisplayName;
    const prefs = getUserPreferences(prefsKey);
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

export async function generateBriefing(
  emailContext: string,
  agentSummary?: string
): Promise<string> {
  try {
    const prompt = buildMorningBriefingPrompt({
      email_thread_context: emailContext,
      agent_activity_summary: agentSummary,
      user_name: "the user",
    });

    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[generateBriefing] Failed:", error);
    return "No briefing available.";
  }
}

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

export async function handleAiCommand(
  userCommand: string,
  emailContext: string
): Promise<string> {
  try {
    const prompt = buildAiCommandPrompt({
      user_command: userCommand,
      email_thread_context: emailContext,
      user_name: "the user",
    });

    const response = await executePrompt(prompt);
    return response.content;
  } catch (error) {
    console.error("[handleAiCommand] Failed:", error);
    return "I couldn't process that command.";
  }
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function handleAiChat(
  messages: ChatMessage[],
  emailContext: string,
  emailCount: number = 0
): Promise<string> {
  try {
    const systemContent = buildAiChatSystemPrompt({
      email_context: emailContext,
      email_count: emailCount,
    });

    const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
      ...messages.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await executeMultiTurnChat(apiMessages, 2048);
    return response;
  } catch (error) {
    console.error("[handleAiChat] Failed:", error);
    return "I couldn't process that request.";
  }
}

export async function expandDraft(
  shorthandNotes: string,
  recipientName: string,
  recipientCompany: string | undefined,
  userDisplayName: string,
  relationship: "client" | "colleague" | "vendor" | "unknown" = "unknown",
  userId?: string
): Promise<string> {
  try {
    const prefsKey = userId || userDisplayName;
    const prefs = getUserPreferences(prefsKey);
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
