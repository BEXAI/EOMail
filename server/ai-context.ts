import type { Email } from "@shared/schema";
import { storage } from "./storage";

interface CachedContext {
  contextString: string;
  emailCount: number;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONTEXT_EMAILS = 20;

class EmailContextIndex {
  private cache = new Map<string, CachedContext>();

  async getContext(userId: string): Promise<string> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.contextString;
    }
    const emails = await storage.getEmails(userId, "all");
    const contextString = this.buildContext(emails);
    this.cache.set(userId, {
      contextString,
      emailCount: emails.length,
      timestamp: Date.now(),
    });
    return contextString;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  private buildContext(emails: Email[]): string {
    const recent = emails.slice(0, MAX_CONTEXT_EMAILS);
    if (recent.length === 0) return "(inbox is empty)";

    return recent.map((e, i) => {
      const status = e.read ? "read" : "unread";
      const star = e.starred ? ", \u2605" : "";
      const category = e.aiCategory ? `[${e.aiCategory}]` : "";
      const urgency = e.aiUrgency ? `(${e.aiUrgency})` : "";
      const summary = e.aiSummary || e.preview || "";
      return `${i + 1}. [${status}${star}] ${category}${urgency} From: ${e.from} <${e.fromEmail}> — "${e.subject}" | ${summary.slice(0, 150)}`;
    }).join("\n");
  }

  compressThread(emails: Email[]): string {
    if (emails.length === 0) return "(no emails)";
    const verbatimCount = 3;
    const parts: string[] = [];

    if (emails.length > verbatimCount) {
      const older = emails.slice(verbatimCount);
      const summaryLines = older.map((e) => {
        const summary = e.aiSummary || e.preview || "";
        return `[${e.from}] ${e.subject}: ${summary.slice(0, 100)}`;
      });
      parts.push(`--- ${older.length} earlier messages (summarized) ---`);
      parts.push(summaryLines.join("\n"));
      parts.push("--- Recent messages (verbatim) ---");
    }

    const recent = emails.slice(0, verbatimCount);
    for (const e of recent) {
      const plainBody = e.body.replace(/<[^>]*>/g, "").trim().slice(0, 1500);
      parts.push(`From: ${e.from} <${e.fromEmail}>\nSubject: ${e.subject}\nDate: ${e.timestamp.toISOString()}\n\n${plainBody}`);
      parts.push("---");
    }

    return parts.join("\n");
  }

  getStats(): { cacheSize: number; entries: { userId: string; emailCount: number; ageMs: number }[] } {
    const entries = Array.from(this.cache.entries()).map(([userId, cached]) => ({
      userId: userId.slice(0, 8) + "...",
      emailCount: cached.emailCount,
      ageMs: Date.now() - cached.timestamp,
    }));
    return { cacheSize: this.cache.size, entries };
  }
}

export const emailContextIndex = new EmailContextIndex();
