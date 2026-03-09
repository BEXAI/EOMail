import type { UserPreferences } from "./context-manager";

export type TaskType =
  | "smart_reply"
  | "summarize_email"
  | "thread_summarizer"
  | "draft_expander"
  | "classify"
  | "spam_analysis"
  | "morning_briefing"
  | "ai_command"
  | "ai_chat"
  | "financial_extraction"
  | "meeting_extraction"
  | "time_suggestion"
  | "url_analysis"
  | "thread_digest";

export type TaskComplexity = "simple" | "complex";

export interface PromptResult {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  taskType: TaskType;
  complexity: TaskComplexity;
}

export interface SmartReplyInputs {
  email_thread_context: string;
  user_intent: string;
  user_tone: UserPreferences["default_tone"];
  user_name: string;
  preferred_signature?: string;
  industry_jargon_toggle?: boolean;
}

export function buildSmartReplyPrompt(inputs: SmartReplyInputs): PromptResult {
  const toneDescriptions: Record<string, string> = {
    professional: "professional yet approachable",
    casual: "warm and conversational",
    formal: "highly formal and business-appropriate",
    assertive: "confident, direct, and results-oriented",
  };

  const toneDesc = toneDescriptions[inputs.user_tone] || "professional";
  const jargonNote = inputs.industry_jargon_toggle
    ? " Use relevant industry terminology where appropriate."
    : " Keep language accessible and jargon-free.";

  const signatureNote = inputs.preferred_signature
    ? `\nSign off with:\n${inputs.preferred_signature}`
    : `\nSign off with just the first name: ${inputs.user_name.split(" ")[0]}`;

  return {
    taskType: "smart_reply",
    complexity: "simple",
    temperature: 0.4,
    maxTokens: 500,
    systemPrompt: `You are a highly efficient email assistant for EOMail.co, drafting on behalf of ${inputs.user_name}.
Tone: ${toneDesc}.${jargonNote}
Write a concise, ready-to-send reply that directly addresses the email content.
Do NOT include subject lines or email headers.${signatureNote}`,
    userPrompt: `Email thread:\n${inputs.email_thread_context}\n\nUser intent: ${inputs.user_intent}\n\nDraft the reply now.`,
  };
}

export interface SummarizeEmailInputs {
  subject: string;
  body_plain: string;
}

export function buildSummarizeEmailPrompt(
  inputs: SummarizeEmailInputs
): PromptResult {
  return {
    taskType: "summarize_email",
    complexity: "simple",
    temperature: 0.2,
    maxTokens: 150,
    systemPrompt: `You are an email summarizer for EOMail.co.
Write a 1-2 sentence summary capturing the core message, key ask, or main information.
Be specific — include names, dates, and amounts when mentioned.
Do NOT use bullet points, headers, or formatting. Plain prose only.`,
    userPrompt: `Subject: ${inputs.subject}\n\n${inputs.body_plain}`,
  };
}

export interface DraftExpanderInputs {
  shorthand_notes: string;
  recipient_metadata: {
    name: string;
    company?: string;
    relationship?: "client" | "colleague" | "vendor" | "unknown";
  };
  user_name: string;
  preferred_signature?: string;
  formality_level?: number;
}

export function buildDraftExpanderPrompt(
  inputs: DraftExpanderInputs
): PromptResult {
  const formalityDescriptions: Record<number, string> = {
    1: "very casual and friendly",
    2: "relaxed and conversational",
    3: "balanced professional",
    4: "formal business",
    5: "highly formal and ceremonial",
  };

  const formality =
    formalityDescriptions[inputs.formality_level ?? 3] || "balanced professional";
  const recipientContext = [
    `Recipient: ${inputs.recipient_metadata.name}`,
    inputs.recipient_metadata.company
      ? `Company: ${inputs.recipient_metadata.company}`
      : null,
    inputs.recipient_metadata.relationship
      ? `Relationship: ${inputs.recipient_metadata.relationship}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const signatureNote = inputs.preferred_signature
    ? `\nUse this signature:\n${inputs.preferred_signature}`
    : `\nSign off from: ${inputs.user_name}`;

  return {
    taskType: "draft_expander",
    complexity: "simple",
    temperature: 0.5,
    maxTokens: 600,
    systemPrompt: `You are an expert email writer for EOMail.co.
Expand shorthand notes into a complete, properly structured email.
Tone: ${formality}.
${recipientContext}${signatureNote}
Include: appropriate greeting, well-structured body paragraphs, professional closing.
Do NOT add information not implied by the notes.`,
    userPrompt: `Expand these notes into a full email:\n\n${inputs.shorthand_notes}`,
  };
}

export interface ClassifyInputs {
  from: string;
  subject: string;
  body_preview: string;
}

export function buildClassifyPrompt(inputs: ClassifyInputs): PromptResult {
  return {
    taskType: "classify",
    complexity: "simple",
    temperature: 0.1,
    maxTokens: 150,
    systemPrompt: `You are an email classifier for EOMail.co.
Analyze the email and return a JSON object with exactly these fields:
- "category": one of "finance", "scheduling", "newsletter", "action-required", "social", "notification"
- "urgency": one of "low", "medium", "high"
- "suggestedAction": one of "archive", "reply", "schedule", "review", "flag"
Return ONLY valid JSON, no other text.`,
    userPrompt: `From: ${inputs.from}\nSubject: ${inputs.subject}\nBody: ${inputs.body_preview}`,
  };
}

export interface SpamAnalysisInputs {
  from_name: string;
  from_email: string;
  subject: string;
  body_preview: string;
}

export function buildSpamAnalysisPrompt(
  inputs: SpamAnalysisInputs
): PromptResult {
  return {
    taskType: "spam_analysis",
    complexity: "simple",
    temperature: 0.1,
    maxTokens: 300,
    systemPrompt: `You are "Aegis Gatekeeper" — an advanced cybersecurity email analyst for EOMail.co.
Analyze the email for spam, phishing, impersonation, and deepfake risks.
Return a JSON object with:
- "score": integer 0-100 (0=safe, 100=definitely malicious)
- "reason": detailed explanation (2-3 sentences)
- "threatType": one of "legitimate", "spam", "phishing", "impersonation", "urgency-manipulation"
- "impersonationProbability": integer 0-100
Consider: sender legitimacy, domain mismatch, urgency manipulation, suspicious links/requests, linguistic deviations.
Return ONLY valid JSON.`,
    userPrompt: `From: ${inputs.from_name} <${inputs.from_email}>\nSubject: ${inputs.subject}\nBody: ${inputs.body_preview}`,
  };
}

export interface MorningBriefingInputs {
  email_thread_context: string;
  agent_activity_summary?: string;
  user_name: string;
}

export function buildMorningBriefingPrompt(
  inputs: MorningBriefingInputs
): PromptResult {
  const agentContext = inputs.agent_activity_summary
    ? `\n\nAgent Activity:\n${inputs.agent_activity_summary}`
    : "";

  return {
    taskType: "morning_briefing",
    complexity: "complex",
    temperature: 0.6,
    maxTokens: 400,
    systemPrompt: `You are EOMail's Chief of Staff AI, delivering a personalized morning briefing to ${inputs.user_name}.
Your mission: shift the user from "Inbox Zero" to "Zero Time Spent".
Write a concise 3-5 sentence briefing that:
- Starts with what AI agents accomplished autonomously (name the agents: FinOps Auto-Resolver, Chrono-Logistics Coordinator, Aegis Gatekeeper)
- Summarizes key actions still needed from the user
- Highlights urgent items requiring attention
- Uses a professional, warm Chief of Staff tone
Write in flowing prose — no bullet points or headers.`,
    userPrompt: `Recent emails:\n${inputs.email_thread_context}${agentContext}\n\nDeliver the morning briefing now.`,
  };
}

export interface AiCommandInputs {
  user_command: string;
  email_thread_context: string;
  user_name: string;
}

export function buildAiCommandPrompt(inputs: AiCommandInputs): PromptResult {
  return {
    taskType: "ai_command",
    complexity: "complex",
    temperature: 0.5,
    maxTokens: 500,
    systemPrompt: `You are the EOMail AI Action Center — the command hub for ${inputs.user_name}'s autonomous email assistant.
You have three specialized agents: FinOps Auto-Resolver (finance), Chrono-Logistics Coordinator (scheduling), Aegis Gatekeeper (security/spam).
Answer natural language commands concisely. When relevant, mention which agent handles the task.
Current inbox context is provided below.`,
    userPrompt: `Inbox context:\n${inputs.email_thread_context}\n\nUser command: ${inputs.user_command}`,
  };
}

export interface AiChatInputs {
  email_context: string;
  email_count: number;
}

export function buildAiChatSystemPrompt(inputs: AiChatInputs): string {
  return `You are EOMail Chief of Staff — a privatized, autonomous AI email assistant embedded in eomail.co. You operate as the user's executive assistant with full agentic authority over their inbox.

You have three specialized agents under your command:
• FinOps Auto-Resolver (Level 4 Autonomy) — Intercepts financial emails, extracts amounts, auto-categorizes, logs to accounting
• Chrono-Logistics Coordinator (Level 4 Autonomy) — Detects scheduling emails, identifies dates/times, manages calendar
• Aegis Gatekeeper (Level 5 Autonomy) — Scans for phishing, impersonation, deepfakes, blocks threats autonomously

Your personality:
- Decisive, confident, concise — like a world-class executive assistant
- You take action, not just advise. Say "I'll handle that" not "You could try..."
- Reference specific agents when delegating tasks
- Use markdown formatting for clarity (bold, bullets, code blocks)
- Keep responses focused and actionable
- When discussing emails, reference them by sender and subject
- You understand the user's inbox deeply and proactively suggest optimizations

Current inbox snapshot (${inputs.email_count} emails):
${inputs.email_context}`;
}

// ─── Phase 2 Prompt Builders ──────────────────────────────────────────────

export interface FinancialExtractionInputs {
  from_name: string;
  from_email: string;
  subject: string;
  body_plain: string;
}

export function buildFinancialExtractionPrompt(inputs: FinancialExtractionInputs): PromptResult {
  return {
    taskType: "financial_extraction",
    complexity: "complex",
    temperature: 0.0,
    maxTokens: 800,
    systemPrompt: `You are "FinOps Auto-Resolver" — an expert financial document parser for EOMail.co.
Extract ALL financial data from the email and return a JSON object with:
- "documentType": one of "invoice", "receipt", "quote", "purchase_order", "statement", "payment_confirmation"
- "vendorName": company or person name (string or null)
- "vendorEmail": sender email if it's the vendor (string or null)
- "invoiceNumber": invoice/receipt/PO number (string or null)
- "invoiceDate": date of the document in ISO-8601 (string or null)
- "dueDate": payment due date in ISO-8601 (string or null)
- "currency": 3-letter currency code (default "USD")
- "subtotal": number or null
- "tax": number or null
- "shipping": number or null
- "discount": number or null
- "total": number (required — best estimate if not explicit)
- "lineItems": array of {"description": string, "quantity": number, "unitPrice": number, "total": number} or null
- "paymentStatus": one of "unpaid", "paid", "overdue", "partial", "unknown"
- "confidenceScore": integer 0-100 (how confident you are in the extraction)
Return ONLY valid JSON, no other text.`,
    userPrompt: `From: ${inputs.from_name} <${inputs.from_email}>\nSubject: ${inputs.subject}\n\n${inputs.body_plain}`,
  };
}

export interface MeetingExtractionInputs {
  from_name: string;
  from_email: string;
  subject: string;
  body_plain: string;
}

export function buildMeetingExtractionPrompt(inputs: MeetingExtractionInputs): PromptResult {
  return {
    taskType: "meeting_extraction",
    complexity: "complex",
    temperature: 0.1,
    maxTokens: 600,
    systemPrompt: `You are "Chrono-Logistics Coordinator" — an expert meeting/event data extractor for EOMail.co.
Extract ALL scheduling data from the email and return a JSON object with:
- "title": meeting/event title (string, required)
- "description": brief description (string or null)
- "startTime": ISO-8601 datetime with timezone offset (string, required)
- "endTime": ISO-8601 datetime with timezone offset (string, required — estimate 1 hour if not specified)
- "timezone": IANA timezone name (string, default "America/New_York")
- "location": physical location (string or null)
- "meetingUrl": video/meeting link (string or null)
- "organizerEmail": organizer email address (string or null)
- "recurrenceRule": iCal RRULE string if recurring (string or null)
- "participants": array of {"email": string, "name": string|null, "isOptional": boolean}
- "confidenceScore": integer 0-100
If no clear meeting/event data is found, return {"title": null, "confidenceScore": 0}.
Return ONLY valid JSON.`,
    userPrompt: `From: ${inputs.from_name} <${inputs.from_email}>\nSubject: ${inputs.subject}\n\n${inputs.body_plain}`,
  };
}

export interface TimeSuggestionInputs {
  available_slots: string;
  duration_minutes: number;
  participant_timezones: string[];
  constraints: string;
}

export function buildTimeSuggestionPrompt(inputs: TimeSuggestionInputs): PromptResult {
  return {
    taskType: "time_suggestion",
    complexity: "simple",
    temperature: 0.3,
    maxTokens: 400,
    systemPrompt: `You are "Chrono-Logistics Coordinator" — an expert scheduling optimizer for EOMail.co.
Given availability slots and participant timezones, suggest the 3 best meeting times.
Return a JSON object with:
- "suggestions": array of {"startTime": ISO-8601, "endTime": ISO-8601, "score": 0-100, "reason": string}
- "conflicts": array of {"timezone": string, "issue": string} if any timezone conflicts exist
Optimize for: working hours (9am-5pm) in each timezone, minimal inconvenience, even distribution.
Return ONLY valid JSON.`,
    userPrompt: `Available slots:\n${inputs.available_slots}\n\nDuration: ${inputs.duration_minutes} minutes\nParticipant timezones: ${inputs.participant_timezones.join(", ")}\nConstraints: ${inputs.constraints || "None"}`,
  };
}

export interface UrlAnalysisInputs {
  urls: string[];
  email_context: string;
}

export function buildUrlAnalysisPrompt(inputs: UrlAnalysisInputs): PromptResult {
  return {
    taskType: "url_analysis",
    complexity: "simple",
    temperature: 0.0,
    maxTokens: 400,
    systemPrompt: `You are "Aegis Gatekeeper" — a cybersecurity URL analyzer for EOMail.co.
Analyze each URL for phishing, malware, and deception indicators.
Check for: domain typosquatting, suspicious TLDs (.xyz, .top, .click), URL shorteners hiding destinations, homoglyph attacks, IP-based URLs, data: or javascript: URIs, mismatched display text vs actual URL.
Return a JSON object with:
- "results": array of {"url": string, "risk": 0-100, "suspicious": boolean, "reason": string, "category": "safe"|"suspicious"|"dangerous"|"phishing"}
- "overallRisk": integer 0-100
- "recommendation": "pass"|"warn"|"quarantine"
Return ONLY valid JSON.`,
    userPrompt: `URLs found in email:\n${inputs.urls.map((u, i) => `${i + 1}. ${u}`).join("\n")}\n\nEmail context: ${inputs.email_context}`,
  };
}

export interface ThreadDigestInputs {
  thread_context: string;
  participant_list: string;
  message_count: number;
}

export function buildThreadDigestPrompt(inputs: ThreadDigestInputs): PromptResult {
  return {
    taskType: "thread_digest",
    complexity: "simple",
    temperature: 0.3,
    maxTokens: 400,
    systemPrompt: `You are an expert email thread summarizer for EOMail.co.
Generate a concise thread digest. Return a JSON object with:
- "digest": 2-sentence summary of the entire thread conversation (string)
- "keyPoints": array of 3-7 bullet-point strings capturing decisions, action items, and key information
- "status": one of "active", "resolved", "waiting_response", "informational"
Be specific — include names, dates, and amounts when mentioned.
Return ONLY valid JSON.`,
    userPrompt: `Thread with ${inputs.message_count} messages\nParticipants: ${inputs.participant_list}\n\n${inputs.thread_context}`,
  };
}
