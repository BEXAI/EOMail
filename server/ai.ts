import OpenAI from "openai";
import type { Email } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

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
  userDisplayName: string,
  tone?: string
): Promise<string> {
  const plainBody = originalEmail.body.replace(/<[^>]*>/g, "").trim();
  let toneInstruction = "";
  if (tone) {
    const toneMap: Record<string, string> = {
      assertive: "Use a confident, direct, and assertive tone. Be clear about expectations and deadlines.",
      casual: "Use a relaxed, friendly, casual tone. Keep it conversational and warm.",
      shorter: "Keep the reply very brief and concise — 2-3 sentences maximum.",
      formal: "Use a highly professional, formal tone with proper business language.",
      gratitude: "Express sincere gratitude and appreciation throughout the reply.",
    };
    toneInstruction = `\nIMPORTANT TONE INSTRUCTION: ${toneMap[tone] || `Write in a ${tone} tone.`}`;
  }

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
- Signs off with just the first name from "${userDisplayName}"${toneInstruction}`,
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

export async function generateBriefing(recentEmails: Email[], agentSummary?: string): Promise<string> {
  const emailSummaries = recentEmails.slice(0, 20).map((e, i) => {
    const status = e.read ? "read" : "unread";
    const ai = e.aiProcessed
      ? ` [AI: ${e.aiCategory || "uncategorized"}, urgency: ${e.aiUrgency || "unknown"}]`
      : "";
    return `${i + 1}. [${status}] From: ${e.from} — "${e.subject}"${ai}`;
  });

  const agentContext = agentSummary ? `\n\nAgent Activity Summary:\n${agentSummary}` : "";

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are EOMail's Chief of Staff AI, providing a morning briefing. Your mission: shift the user from "Inbox Zero" to "Zero Time Spent". Given the user's recent emails and agent activity, write a concise 3-5 sentence briefing that:
- Starts with what your AI agents accomplished autonomously (e.g., "I auto-archived 3 newsletters, logged 1 financial receipt, and drafted 2 replies for your review.")
- Summarizes key actions still needed from the user
- Highlights urgent items requiring attention
- Uses a professional but warm Chief of Staff tone
- Mentions specific agent names when relevant (FinOps Auto-Resolver, Chrono-Logistics Coordinator, Aegis Gatekeeper)

Do NOT use bullet points or headers. Write in flowing prose.`,
      },
      {
        role: "user",
        content: `Here are the recent emails:\n\n${emailSummaries.join("\n")}${agentContext}`,
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
): Promise<{ score: number; reason: string; threatType: string; impersonationProbability: number }> {
  const plainBody = body.replace(/<[^>]*>/g, "").trim();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are the "Aegis Gatekeeper" — an advanced cybersecurity email analyst. Analyze the email for spam, phishing, impersonation, and deepfake risks. Return a JSON object with:
- "score": integer 0-100 (0=safe, 100=definitely malicious)
- "reason": detailed explanation of the risk assessment
- "threatType": one of "legitimate", "spam", "phishing", "impersonation", "urgency-manipulation"
- "impersonationProbability": integer 0-100 (probability this email is impersonating someone)

Consider: sender legitimacy, domain mismatch, urgency manipulation, suspicious links/requests, linguistic baseline deviations, routing metadata anomalies, AI-generated text patterns.
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
      threatType: parsed.threatType || "legitimate",
      impersonationProbability: Math.min(100, Math.max(0, parseInt(parsed.impersonationProbability) || 0)),
    };
  } catch {
    return { score: 0, reason: "Unable to assess risk.", threatType: "legitimate", impersonationProbability: 0 };
  }
}

export async function handleAiCommand(
  prompt: string,
  recentEmails: Email[]
): Promise<string> {
  const emailContext = recentEmails.slice(0, 15).map((e, i) => {
    const status = e.read ? "read" : "unread";
    const summary = e.aiSummary || e.preview;
    const agent = e.aiCategory === "finance" ? "[FinOps]" : e.aiCategory === "scheduling" ? "[Chrono]" : "";
    return `${i + 1}. [${status}${e.starred ? ", starred" : ""}] ${agent} From: ${e.from} — "${e.subject}" | ${summary}`;
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are the EOMail AI Action Center — the command hub for an autonomous email assistant. The user can issue natural language commands about their inbox. You have access to their recent emails listed below.

You have three specialized agents at your disposal:
- FinOps Auto-Resolver: Handles financial emails, receipts, invoices, subscriptions
- Chrono-Logistics Coordinator: Handles scheduling, meetings, calendar items
- Aegis Gatekeeper: Handles security, spam, phishing threats

Answer concisely and helpfully. When relevant, mention which agent would handle the task. If asked to draft or act, describe what you would do.

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
