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
  buildFinancialExtractionPrompt,
  buildMeetingExtractionPrompt,
  buildTimeSuggestionPrompt,
  buildUrlAnalysisPrompt,
  buildThreadDigestPrompt,
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
    const prefs = await getUserPreferences(prefsKey);
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
    const prefs = await getUserPreferences(prefsKey);
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

// ─── Phase 2 AI Functions ──────────────────────────────────────────────────

export interface FinancialExtractionResult {
  documentType: string;
  vendorName: string | null;
  vendorEmail: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  shipping: number | null;
  discount: number | null;
  total: number;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> | null;
  paymentStatus: string;
  confidenceScore: number;
}

export async function extractFinancialDocument(
  from: string,
  fromEmail: string,
  subject: string,
  body: string
): Promise<FinancialExtractionResult | null> {
  try {
    const plainBody = stripHtml(body).slice(0, 3000);
    const prompt = buildFinancialExtractionPrompt({
      from_name: from,
      from_email: fromEmail,
      subject,
      body_plain: plainBody,
    });

    const result = await executeJsonPrompt<FinancialExtractionResult>(prompt);

    return {
      documentType: result.documentType || "invoice",
      vendorName: result.vendorName || null,
      vendorEmail: result.vendorEmail || fromEmail,
      invoiceNumber: result.invoiceNumber || null,
      invoiceDate: result.invoiceDate || null,
      dueDate: result.dueDate || null,
      currency: result.currency || "USD",
      subtotal: result.subtotal != null ? Number(result.subtotal) : null,
      tax: result.tax != null ? Number(result.tax) : null,
      shipping: result.shipping != null ? Number(result.shipping) : null,
      discount: result.discount != null ? Number(result.discount) : null,
      total: Number(result.total) || 0,
      lineItems: Array.isArray(result.lineItems) ? result.lineItems : null,
      paymentStatus: result.paymentStatus || "unknown",
      confidenceScore: Math.min(100, Math.max(0, parseInt(String(result.confidenceScore)) || 50)),
    };
  } catch (error) {
    console.error("[extractFinancialDocument] Failed:", error);
    return null;
  }
}

export interface MeetingExtractionResult {
  title: string | null;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  organizerEmail: string | null;
  recurrenceRule: string | null;
  participants: Array<{ email: string; name: string | null; isOptional: boolean }>;
  confidenceScore: number;
}

export async function extractMeetingData(
  from: string,
  fromEmail: string,
  subject: string,
  body: string
): Promise<MeetingExtractionResult | null> {
  try {
    const plainBody = stripHtml(body).slice(0, 3000);
    const prompt = buildMeetingExtractionPrompt({
      from_name: from,
      from_email: fromEmail,
      subject,
      body_plain: plainBody,
    });

    const result = await executeJsonPrompt<MeetingExtractionResult>(prompt);

    if (!result.title || result.confidenceScore === 0) {
      return null;
    }

    return {
      title: result.title,
      description: result.description || null,
      startTime: result.startTime,
      endTime: result.endTime,
      timezone: result.timezone || "America/New_York",
      location: result.location || null,
      meetingUrl: result.meetingUrl || null,
      organizerEmail: result.organizerEmail || fromEmail,
      recurrenceRule: result.recurrenceRule || null,
      participants: Array.isArray(result.participants) ? result.participants : [],
      confidenceScore: Math.min(100, Math.max(0, parseInt(String(result.confidenceScore)) || 50)),
    };
  } catch (error) {
    console.error("[extractMeetingData] Failed:", error);
    return null;
  }
}

export interface TimeSuggestionResult {
  suggestions: Array<{ startTime: string; endTime: string; score: number; reason: string }>;
  conflicts: Array<{ timezone: string; issue: string }>;
}

export async function suggestOptimalTime(
  availableSlots: string,
  durationMinutes: number,
  participantTimezones: string[],
  constraints?: string
): Promise<TimeSuggestionResult> {
  try {
    const prompt = buildTimeSuggestionPrompt({
      available_slots: availableSlots,
      duration_minutes: durationMinutes,
      participant_timezones: participantTimezones,
      constraints: constraints || "",
    });

    const result = await executeJsonPrompt<TimeSuggestionResult>(prompt);
    return {
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      conflicts: Array.isArray(result.conflicts) ? result.conflicts : [],
    };
  } catch (error) {
    console.error("[suggestOptimalTime] Failed:", error);
    return { suggestions: [], conflicts: [] };
  }
}

export interface UrlAnalysisResult {
  results: Array<{ url: string; risk: number; suspicious: boolean; reason: string; category: string }>;
  overallRisk: number;
  recommendation: "pass" | "warn" | "quarantine";
}

export async function analyzeUrls(
  urls: string[],
  emailContext: string
): Promise<UrlAnalysisResult> {
  try {
    if (urls.length === 0) {
      return { results: [], overallRisk: 0, recommendation: "pass" };
    }
    const prompt = buildUrlAnalysisPrompt({
      urls: urls.slice(0, 20),
      email_context: emailContext.slice(0, 500),
    });

    const result = await executeJsonPrompt<UrlAnalysisResult>(prompt);
    return {
      results: Array.isArray(result.results) ? result.results : [],
      overallRisk: Math.min(100, Math.max(0, parseInt(String(result.overallRisk)) || 0)),
      recommendation: (["pass", "warn", "quarantine"].includes(result.recommendation) ? result.recommendation : "pass") as "pass" | "warn" | "quarantine",
    };
  } catch (error) {
    console.error("[analyzeUrls] Failed:", error);
    return { results: [], overallRisk: 0, recommendation: "pass" };
  }
}

export interface ThreadDigestResult {
  digest: string;
  keyPoints: string[];
  status: string;
}

export async function summarizeThread(
  threadContext: string,
  participantList: string,
  messageCount: number
): Promise<ThreadDigestResult> {
  try {
    const prompt = buildThreadDigestPrompt({
      thread_context: threadContext.slice(0, 4000),
      participant_list: participantList,
      message_count: messageCount,
    });

    const result = await executeJsonPrompt<ThreadDigestResult>(prompt);
    return {
      digest: result.digest || "Thread summary unavailable.",
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      status: result.status || "active",
    };
  } catch (error) {
    console.error("[summarizeThread] Failed:", error);
    return { digest: "Thread summary unavailable.", keyPoints: [], status: "active" };
  }
}
