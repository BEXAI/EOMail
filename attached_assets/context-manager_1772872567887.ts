/**
 * EOMail.co — System Wrapper: Context Manager
 * Handles thread compression, metadata injection, and user preference retrieval.
 * Optimizes token usage before hitting the LLM API.
 */

import type { Email } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  preferred_signature: string;
  default_tone: "professional" | "casual" | "formal" | "assertive";
  industry_jargon_toggle: boolean;
  formality_level: 1 | 2 | 3 | 4 | 5; // 1 = very casual, 5 = very formal
}

export interface EmailMetadata {
  sender_name: string;
  recipient_name: string;
  timestamp: string;
  subject_line: string;
  user_role: string;
}

export interface CompressedThread {
  recentEmails: Email[];         // Last 3 verbatim
  historicalSummary: string;     // Older emails compressed to summary
  totalTokensEstimate: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_TOKENS = 4096;
const VERBATIM_COUNT = 3;
// Rough estimate: 1 token ≈ 4 chars
const CHARS_PER_TOKEN = 4;

// ─── Default User Preferences ─────────────────────────────────────────────────

const DEFAULT_PREFERENCES: UserPreferences = {
  preferred_signature: "",
  default_tone: "professional",
  industry_jargon_toggle: false,
  formality_level: 3,
};

// In-memory preference store (replace with DB calls in production)
const preferenceStore = new Map<string, UserPreferences>();

// ─── User Preference Store ─────────────────────────────────────────────────────

/**
 * Retrieves user preferences by userId.
 * Returns defaults if no preferences have been saved.
 */
export function getUserPreferences(userId: string): UserPreferences {
  return preferenceStore.get(userId) ?? { ...DEFAULT_PREFERENCES };
}

/**
 * Saves or updates user preferences.
 */
export function setUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): UserPreferences {
  const existing = getUserPreferences(userId);
  const updated = { ...existing, ...prefs };
  preferenceStore.set(userId, updated);
  return updated;
}

// ─── Metadata Injector ────────────────────────────────────────────────────────

/**
 * Extracts structured metadata from an email for LLM context injection.
 * Provides situational awareness without heavy token overhead.
 */
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

/**
 * Formats metadata as a compact system prompt prefix.
 * Injects context without consuming excessive tokens.
 */
export function formatMetadataPrefix(meta: EmailMetadata): string {
  return [
    `[Context]`,
    `Sender: ${meta.sender_name}`,
    `Recipient: ${meta.recipient_name}`,
    `Date: ${meta.timestamp}`,
    `Subject: ${meta.subject_line}`,
  ].join(" | ");
}

// ─── Thread Compressor ────────────────────────────────────────────────────────

/**
 * Estimates token count from character length.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Strips HTML tags and trims whitespace from email body.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Compresses an email thread using rolling window + summarization strategy.
 * - Keeps last VERBATIM_COUNT (3) emails verbatim
 * - Summarizes older emails into a compact historical summary
 * - Respects MAX_TOKENS budget
 */
export function compressThread(emails: Email[]): CompressedThread {
  if (emails.length === 0) {
    return {
      recentEmails: [],
      historicalSummary: "",
      totalTokensEstimate: 0,
    };
  }

  // Sort by timestamp descending (newest first)
  const sorted = [...emails].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recentEmails = sorted.slice(0, VERBATIM_COUNT);
  const olderEmails = sorted.slice(VERBATIM_COUNT);

  // Build historical summary for older emails
  let historicalSummary = "";
  if (olderEmails.length > 0) {
    const summaryLines = olderEmails.map((e) => {
      const summary = e.aiSummary || stripHtml(e.body).slice(0, 100);
      const date = new Date(e.timestamp).toLocaleDateString();
      return `• [${date}] ${e.from}: "${e.subject}" — ${summary}`;
    });
    historicalSummary = `[Thread History — ${olderEmails.length} earlier email(s)]:\n${summaryLines.join("\n")}`;
  }

  // Estimate total tokens
  const recentTokens = recentEmails.reduce(
    (sum, e) => sum + estimateTokens(e.subject + stripHtml(e.body).slice(0, 500)),
    0
  );
  const historyTokens = estimateTokens(historicalSummary);
  const totalTokensEstimate = Math.min(
    recentTokens + historyTokens,
    MAX_TOKENS
  );

  return { recentEmails, historicalSummary, totalTokensEstimate };
}

/**
 * Formats a compressed thread for inclusion in a prompt.
 */
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

/**
 * Builds the full enriched context string for an email + user preferences.
 */
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
