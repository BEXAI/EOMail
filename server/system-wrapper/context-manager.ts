import type { Email } from "@shared/schema";
import { storage } from "../storage";

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
const PREFERENCE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const preferenceStore = new Map<string, { prefs: UserPreferences; timestamp: number }>();

// Periodic sweep to evict expired preference entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of preferenceStore) {
    if (now - entry.timestamp > PREFERENCE_TTL_MS) {
      preferenceStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const cached = preferenceStore.get(userId);
  if (cached && Date.now() - cached.timestamp < PREFERENCE_TTL_MS) return cached.prefs;

  try {
    const row = await storage.getUserPreferencesRow(userId);
    if (row) {
      const prefs: UserPreferences = {
        preferred_signature: row.preferredSignature || "",
        default_tone: (row.defaultTone as UserPreferences["default_tone"]) || "professional",
        industry_jargon_toggle: row.industryJargonToggle || false,
        formality_level: (row.formalityLevel as UserPreferences["formality_level"]) || 3,
      };
      preferenceStore.set(userId, { prefs, timestamp: Date.now() });
      return prefs;
    }
  } catch {
    // Fall through to defaults on DB error
  }

  return { ...DEFAULT_PREFERENCES };
}

export async function setUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<UserPreferences> {
  const existing = await getUserPreferences(userId);
  const updated = { ...existing, ...prefs };

  // Persist to DB
  try {
    await storage.upsertUserPreferences(userId, {
      userId,
      preferredSignature: updated.preferred_signature,
      defaultTone: updated.default_tone,
      industryJargonToggle: updated.industry_jargon_toggle,
      formalityLevel: updated.formality_level,
    });
  } catch (e) {
    console.error("Failed to persist user preferences:", e);
  }

  // Update cache
  if (!preferenceStore.has(userId) && preferenceStore.size >= MAX_PREFERENCE_STORE_SIZE) {
    const firstKey = preferenceStore.keys().next().value;
    if (firstKey) preferenceStore.delete(firstKey);
  }
  preferenceStore.set(userId, { prefs: updated, timestamp: Date.now() });
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
