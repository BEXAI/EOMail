import type { Email } from "@shared/schema";

const PII_PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: "credit_card",
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    replacement: "[REDACTED:CREDIT_CARD]",
  },
  {
    name: "ssn",
    regex: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
    replacement: "[REDACTED:SSN]",
  },
  {
    name: "password",
    regex: /\b(?:password|passwd|pwd|pass)[\s:=]+\S+/gi,
    replacement: "[REDACTED:PASSWORD]",
  },
  {
    name: "api_key",
    regex: /\b(?:sk-|pk-|Bearer\s+)[A-Za-z0-9_\-]{20,}\b/g,
    replacement: "[REDACTED:API_KEY]",
  },
  {
    name: "bank_account",
    regex: /\b(?:account|acct|routing)[\s#:]+\d{8,17}\b/gi,
    replacement: "[REDACTED:BANK_ACCOUNT]",
  },
];

export function redactPII(text: string): {
  sanitized: string;
  redactions: Array<{ type: string; count: number }>;
} {
  let sanitized = text;
  const redactions: Array<{ type: string; count: number }> = [];

  for (const pattern of PII_PATTERNS) {
    const matches = sanitized.match(pattern.regex);
    if (matches && matches.length > 0) {
      redactions.push({ type: pattern.name, count: matches.length });
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    }
  }

  return { sanitized, redactions };
}

export function sanitizeMessages(
  messages: Array<{ role: string; content: string }>,
  includeSystem: boolean = false
): {
  messages: Array<{ role: string; content: string }>;
  totalRedactions: number;
} {
  let totalRedactions = 0;

  const sanitizedMessages = messages.map((msg) => {
    if (msg.role === "user" || (includeSystem && msg.role === "system")) {
      const { sanitized, redactions } = redactPII(msg.content);
      totalRedactions += redactions.reduce((sum, r) => sum + r.count, 0);
      return { ...msg, content: sanitized };
    }
    return msg;
  });

  return { messages: sanitizedMessages, totalRedactions };
}

export function validateApiKey(key: string | undefined): boolean {
  if (!key) return false;
  if (key.length < 20) return false;
  if (key.startsWith("sk-") && key.length > 40) return true;
  if (key.length >= 32) return true;
  return false;
}
