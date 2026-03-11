import crypto from "crypto";
import type { Email } from "@shared/schema";

/**
 * Normalize email subject by stripping Re:, Fwd:, Fw:, Aw:, Sv: prefixes.
 * Trims whitespace for consistent hashing.
 */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(\s*(re|fwd?|aw|sv|vs|ref)\s*:\s*)+/gi, "")
    .trim();
}

/**
 * Generate a deterministic thread ID from normalized subject + userId.
 * SHA-256 truncated to 16 hex chars.
 */
export function generateThreadId(normalizedSubject: string, userId: string): string {
  const input = `${userId}:${normalizedSubject.toLowerCase()}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Detect and assign a thread ID for a single email.
 */
export function detectThread(email: Email): {
  threadId: string;
  threadSubject: string;
} {
  const normalizedSubject = normalizeSubject(email.subject);
  const threadId = generateThreadId(normalizedSubject, email.userId);
  return { threadId, threadSubject: normalizedSubject };
}

/**
 * Group a batch of emails into threads by normalized subject hash.
 * Returns a map: threadId -> { threadSubject, emails[] } sorted oldest-first.
 */
export function groupEmailsIntoThreads(
  emailList: Email[]
): Map<string, { threadSubject: string; emails: Email[] }> {
  const threads = new Map<string, { threadSubject: string; emails: Email[] }>();

  for (const email of emailList) {
    const { threadId, threadSubject } = detectThread(email);
    const existing = threads.get(threadId);
    if (existing) {
      existing.emails.push(email);
    } else {
      threads.set(threadId, { threadSubject, emails: [email] });
    }
  }

  for (const [, thread] of threads) {
    thread.emails.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  return threads;
}
