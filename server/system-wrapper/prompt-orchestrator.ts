import type { UserPreferences } from "./context-manager";

export type TaskType =
  | "smart_reply"
  | "thread_summarizer"
  | "draft_expander"
  | "classify"
  | "spam_analysis"
  | "morning_briefing"
  | "ai_command"
  | "ai_chat";

export type TaskComplexity = "simple" | "complex";

const TASK_COMPLEXITY_MAP: Record<TaskType, TaskComplexity> = {
  smart_reply: "simple",
  thread_summarizer: "simple",
  draft_expander: "simple",
  classify: "simple",
  spam_analysis: "simple",
  morning_briefing: "complex",
  ai_command: "complex",
  ai_chat: "complex",
};

export function getTaskComplexity(task: TaskType): TaskComplexity {
  return TASK_COMPLEXITY_MAP[task];
}

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

export interface ThreadSummarizerInputs {
  email_thread_context: string;
}

export function buildThreadSummarizerPrompt(
  inputs: ThreadSummarizerInputs
): PromptResult {
  return {
    taskType: "thread_summarizer",
    complexity: "simple",
    temperature: 0.2,
    maxTokens: 300,
    systemPrompt: `You are an expert at extracting structured insights from email threads.
Extract the core decisions, action items, and pending questions.
Output as a concise bulleted list with clear section headers: Decisions, Action Items, Open Questions.
Be specific — include names, dates, and amounts when mentioned.`,
    userPrompt: `Summarize this email thread:\n\n${inputs.email_thread_context}`,
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
