import OpenAI from "openai";
import type { Email } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODEL = "gpt-5-mini";

export async function summarizeEmail(subject: string, body: string): Promise<string> {
  const plainBody = body.replace(/<[^>]*>/g, "").trim();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "You are an email assistant. Summarize the email in 1-2 concise sentences. Focus on the key action items or information. Do not use quotes or prefixes like 'Summary:'.",
      },
      {
        role: "user",
        content: `Subject: ${subject}\n\nBody: ${plainBody.slice(0, 2000)}`,
      },
    ],
    max_completion_tokens: 8192,
  });
  return response.choices[0]?.message?.content?.trim() || "Unable to generate summary.";
}

export async function classifyEmail(
  from: string,
  subject: string,
  body: string
): Promise<{ category: string; urgency: string; suggestedAction: string }> {
  const plainBody = body.replace(/<[^>]*>/g, "").trim();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an email classifier. Analyze the email and return a JSON object with exactly these fields:
- "category": one of "finance", "scheduling", "newsletter", "action-required", "social", "notification"
- "urgency": one of "low", "medium", "high"
- "suggestedAction": one of "archive", "reply", "schedule", "review", "flag"

Return ONLY valid JSON, no other text.`,
      },
      {
        role: "user",
        content: `From: ${from}\nSubject: ${subject}\nBody: ${plainBody.slice(0, 1500)}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      category: parsed.category || "notification",
      urgency: parsed.urgency || "low",
      suggestedAction: parsed.suggestedAction || "review",
    };
  } catch {
    return { category: "notification", urgency: "low", suggestedAction: "review" };
  }
}

export async function draftReply(
  originalEmail: Email,
  userDisplayName: string
): Promise<string> {
  const plainBody = originalEmail.body.replace(/<[^>]*>/g, "").trim();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an AI email assistant drafting a professional reply on behalf of "${userDisplayName}". 
Write a natural, concise reply that:
- Addresses the key points in the original email
- Matches a professional but friendly tone
- Is ready to send with minimal edits
- Does NOT include subject line or email headers
- Signs off with just the first name from "${userDisplayName}"`,
      },
      {
        role: "user",
        content: `Original email from ${originalEmail.from} (${originalEmail.fromEmail}):\nSubject: ${originalEmail.subject}\n\n${plainBody.slice(0, 2000)}`,
      },
    ],
    max_completion_tokens: 8192,
  });
  return response.choices[0]?.message?.content?.trim() || "Unable to draft reply.";
}

export async function generateBriefing(recentEmails: Email[]): Promise<string> {
  const emailSummaries = recentEmails.slice(0, 20).map((e, i) => {
    const status = e.read ? "read" : "unread";
    const ai = e.aiProcessed
      ? ` [AI: ${e.aiCategory || "uncategorized"}, urgency: ${e.aiUrgency || "unknown"}]`
      : "";
    return `${i + 1}. [${status}] From: ${e.from} — "${e.subject}"${ai}`;
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an AI email Chief of Staff providing a morning briefing. Given the user's recent emails, write a concise 3-5 sentence briefing paragraph that:
- Summarizes key actions needed
- Highlights urgent items
- Notes any patterns (e.g., "3 newsletters archived", "1 financial receipt logged")
- Uses a professional but warm tone
- Starts with a brief overview, then priorities

Do NOT use bullet points or headers. Write in flowing prose.`,
      },
      {
        role: "user",
        content: `Here are the recent emails:\n\n${emailSummaries.join("\n")}`,
      },
    ],
    max_completion_tokens: 8192,
  });
  return response.choices[0]?.message?.content?.trim() || "No briefing available.";
}

export async function analyzeSpamRisk(
  from: string,
  fromEmail: string,
  subject: string,
  body: string
): Promise<{ score: number; reason: string }> {
  const plainBody = body.replace(/<[^>]*>/g, "").trim();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a cybersecurity email analyst (the "Aegis Gatekeeper"). Analyze the email for spam, phishing, and impersonation risks. Return a JSON object with:
- "score": integer 0-100 (0=safe, 100=definitely malicious)
- "reason": brief explanation of the risk assessment

Consider: sender legitimacy, urgency manipulation, suspicious links/requests, linguistic patterns, domain mismatch.
Return ONLY valid JSON.`,
      },
      {
        role: "user",
        content: `From: ${from} <${fromEmail}>\nSubject: ${subject}\nBody: ${plainBody.slice(0, 1500)}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      score: Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
      reason: parsed.reason || "Unable to assess risk.",
    };
  } catch {
    return { score: 0, reason: "Unable to assess risk." };
  }
}

export async function handleAiCommand(
  prompt: string,
  recentEmails: Email[]
): Promise<string> {
  const emailContext = recentEmails.slice(0, 15).map((e, i) => {
    const status = e.read ? "read" : "unread";
    const summary = e.aiSummary || e.preview;
    return `${i + 1}. [${status}${e.starred ? ", starred" : ""}] From: ${e.from} — "${e.subject}" | ${summary}`;
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are the AIMAIL AI Command Center. The user can ask natural language questions about their inbox. You have access to their recent emails listed below. Answer concisely and helpfully. If asked to draft or act, describe what you would do.

Recent emails:
${emailContext.join("\n")}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_completion_tokens: 8192,
  });
  return response.choices[0]?.message?.content?.trim() || "I couldn't process that command.";
}
