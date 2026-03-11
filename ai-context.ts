import type { Email } from "@shared/schema";
import { storage } from "./storage";

interface CachedContext {
  contextString: string;
  emailCount: number;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONTEXT_EMAILS = 20;
const MAX_CONTEXT_CHARS = 14000;
const MAX_CACHE_SIZE = 1000;

class EmailContextIndex {
  private cache = new Map<string, CachedContext>();

  constructor() {
    // Periodic sweep to evict expired entries and prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache) {
        if (now - cached.timestamp > CACHE_TTL_MS) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000);
  }

  private enforceMaxSize(): void {
    if (this.cache.size < MAX_CACHE_SIZE) return;
    // Evict oldest entries
    let oldest: { key: string; ts: number } | null = null;
    for (const [key, cached] of this.cache) {
      if (!oldest || cached.timestamp < oldest.ts) {
        oldest = { key, ts: cached.timestamp };
      }
    }
    if (oldest) this.cache.delete(oldest.key);
  }

  async getContext(userId: string): Promise<string> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.contextString;
    }
    const emails = await storage.getEmails(userId, "all", undefined, undefined, 20);
    const contextString = this.buildContext(emails);
    this.enforceMaxSize();
    this.cache.set(userId, {
      contextString,
      emailCount: emails.length,
      timestamp: Date.now(),
    });
    return contextString;
  }

  async getContextWithCount(userId: string): Promise<{ context: string; count: number }> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { context: cached.contextString, count: cached.emailCount };
    }
    const emails = await storage.getEmails(userId, "all", undefined, undefined, 20);
    const contextString = this.buildContext(emails);
    this.enforceMaxSize();
    this.cache.set(userId, {
      contextString,
      emailCount: emails.length,
      timestamp: Date.now(),
    });
    return { context: contextString, count: emails.length };
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  private buildContext(emails: Email[]): string {
    const recent = emails.slice(0, MAX_CONTEXT_EMAILS);
    if (recent.length === 0) return "(inbox is empty)";

    const lines: string[] = [];
    let totalChars = 0;

    for (let i = 0; i < recent.length; i++) {
      const e = recent[i];
      const status = e.read ? "read" : "unread";
      const star = e.starred ? ", \u2605" : "";
      const category = e.aiCategory ? `[${e.aiCategory}]` : "";
      const urgency = e.aiUrgency ? `(${e.aiUrgency})` : "";
      const summary = e.aiSummary || e.preview || "";
      const line = `${i + 1}. [${status}${star}] ${category}${urgency} From: ${e.from} <${e.fromEmail}> — "${e.subject}" | ${summary.slice(0, 150)}`;

      if (totalChars + line.length > MAX_CONTEXT_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }

    return lines.join("\n");
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
