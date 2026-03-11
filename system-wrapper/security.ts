const PII_PATTERN_DEFS: Array<{ name: string; source: string; flags: string; replacement: string }> = [
  {
    name: "credit_card",
    source: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b",
    flags: "g",
    replacement: "[REDACTED:CREDIT_CARD]",
  },
  {
    name: "ssn",
    source: "\\b(?!000|666|9\\d{2})\\d{3}[-\\s]?(?!00)\\d{2}[-\\s]?(?!0000)\\d{4}\\b",
    flags: "g",
    replacement: "[REDACTED:SSN]",
  },
  {
    name: "password",
    source: "\\b(?:password|passwd|pwd|pass)[\\s:=]+\\S+",
    flags: "gi",
    replacement: "[REDACTED:PASSWORD]",
  },
  {
    name: "api_key",
    source: "\\b(?:sk-|pk-|Bearer\\s+)[A-Za-z0-9_\\-]{20,}\\b",
    flags: "g",
    replacement: "[REDACTED:API_KEY]",
  },
  {
    name: "bank_account",
    source: "\\b(?:account|acct|routing)[\\s#:]+\\d{8,17}\\b",
    flags: "gi",
    replacement: "[REDACTED:BANK_ACCOUNT]",
  },
];

export function redactPII(text: string): {
  sanitized: string;
  redactions: Array<{ type: string; count: number }>;
} {
  let sanitized = text;
  const redactions: Array<{ type: string; count: number }> = [];

  for (const def of PII_PATTERN_DEFS) {
    const regex = new RegExp(def.source, def.flags);
    const matches = sanitized.match(regex);
    if (matches && matches.length > 0) {
      redactions.push({ type: def.name, count: matches.length });
      const replaceRegex = new RegExp(def.source, def.flags);
      sanitized = sanitized.replace(replaceRegex, def.replacement);
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
