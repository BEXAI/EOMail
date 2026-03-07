import type { Email } from "@shared/schema";

export interface UserPreferences {
  preferred_signature: string;
  default_tone: "professional" | "casual" | "formal" | "assertive";
  industry_jargon_toggle: boolean;
  formality_level: 1 | 2 | 3 | 4 | 5;
}

export interface EmailMetadata {
  sender_name: string;
  recipient_name: string;
  timestamp: string;
  subject_line: string;
  user_role: string;
}

export interface CompressedThread {
  recentEmails: Email[];
  historicalSummary: string;
  totalTokensEstimate: number;
}

const MAX_TOKENS = 4096;
const VERBATIM_COUNT = 3;
const CHARS_PER_TOKEN = 4;

const DEFAULT_PREFERENCES: UserPreferences = {
  preferred_signature: "",
  default_tone: "professional",
  industry_jargon_toggle: false,
  formality_level: 3,
};

const MAX_PREFERENCE_STORE_SIZE = 5000;
const preferenceStore = new Map<string, UserPreferences>();

export function getUserPreferences(userId: string): UserPreferences {
  return preferenceStore.get(userId) ?? { ...DEFAULT_PREFERENCES };
}

export function setUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): UserPreferences {
  const existing = getUserPreferences(userId);
  const updated = { ...existing, ...prefs };
  // Evict oldest entry if at capacity
  if (!preferenceStore.has(userId) && preferenceStore.size >= MAX_PREFERENCE_STORE_SIZE) {
    const firstKey = preferenceStore.keys().next().value;
    if (firstKey) preferenceStore.delete(firstKey);
  }
  preferenceStore.set(userId, updated);
  return updated;
}

export function extractMetadata(
  email: Email,
  userDisplayName: string
): EmailMetadata {
  return {
    sender_name: email.from,
    recipient_name: userDisplayName,
    timestamp: new Date(email.timestamp).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    subject_line: email.subject,
    user_role: "email_user",
  };
}

export function formatMetadataPrefix(meta: EmailMetadata): string {
  return [
    `[Context]`,
    `Sender: ${meta.sender_name}`,
    `Recipient: ${meta.recipient_name}`,
    `Date: ${meta.timestamp}`,
    `Subject: ${meta.subject_line}`,
  ].join(" | ");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function compressThread(emails: Email[]): CompressedThread {
  if (emails.length === 0) {
    return { recentEmails: [], historicalSummary: "", totalTokensEstimate: 0 };
  }

  const sorted = [...emails].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recentEmails = sorted.slice(0, VERBATIM_COUNT);
  const olderEmails = sorted.slice(VERBATIM_COUNT);

  let historicalSummary = "";
  if (olderEmails.length > 0) {
    const summaryLines = olderEmails.map((e) => {
      const summary = e.aiSummary || stripHtml(e.body).slice(0, 100);
      const date = new Date(e.timestamp).toLocaleDateString();
      return `• [${date}] ${e.from}: "${e.subject}" — ${summary}`;
    });
    historicalSummary = `[Thread History — ${olderEmails.length} earlier email(s)]:\n${summaryLines.join("\n")}`;
  }

  const recentTokens = recentEmails.reduce(
    (sum, e) => sum + estimateTokens(e.subject + stripHtml(e.body).slice(0, 500)),
    0
  );
  const historyTokens = estimateTokens(historicalSummary);
  const totalTokensEstimate = Math.min(recentTokens + historyTokens, MAX_TOKENS);

  return { recentEmails, historicalSummary, totalTokensEstimate };
}

export function formatThreadForPrompt(compressed: CompressedThread): string {
  const parts: string[] = [];

  if (compressed.historicalSummary) {
    parts.push(compressed.historicalSummary);
    parts.push("---");
  }

  const recentParts = compressed.recentEmails.map((e, i) => {
    const body = stripHtml(e.body).slice(0, 800);
    const label = i === 0 ? "[Most Recent]" : `[${i + 1} email(s) ago]`;
    return `${label}\nFrom: ${e.from} <${e.fromEmail}>\nSubject: ${e.subject}\n\n${body}`;
  });

  parts.push(...recentParts);
  return parts.join("\n\n");
}

export function buildEmailContext(
  email: Email,
  userDisplayName: string,
  threadEmails: Email[] = []
): string {
  const meta = extractMetadata(email, userDisplayName);
  const metaPrefix = formatMetadataPrefix(meta);

  const allEmails = threadEmails.length > 0 ? threadEmails : [email];
  const compressed = compressThread(allEmails);
  const threadText = formatThreadForPrompt(compressed);

  return `${metaPrefix}\n\n${threadText}`;
}
