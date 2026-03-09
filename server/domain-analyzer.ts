interface DomainAnalysis {
  domain: string;
  isDisposable: boolean;
  isFreeProvider: boolean;
  hasTyposquatting: boolean;
  suspiciousTld: boolean;
  riskScore: number;
  flags: string[];
}

const SUSPICIOUS_TLDS = new Set([
  ".xyz", ".top", ".click", ".club", ".info", ".biz",
  ".work", ".date", ".stream", ".download", ".racing",
  ".win", ".bid", ".loan", ".trade", ".gq", ".cf", ".tk", ".ml", ".ga",
]);

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "aol.com", "protonmail.com", "icloud.com", "mail.com",
  "yandex.com", "zoho.com", "gmx.com",
]);

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "guerrillamail.com", "mailinator.com",
  "throwaway.email", "trashmail.com", "yopmail.com",
  "sharklasers.com", "guerrillamailblock.com", "10minutemail.com",
]);

const TYPOSQUAT_TARGETS: Array<{ real: string; pattern: RegExp }> = [
  { real: "google.com", pattern: /g[o0]{2,}gle|goo[g9]le|googl[e3]|gogle/i },
  { real: "microsoft.com", pattern: /micros[o0]ft|microso[f7]t|micr[o0]s[o0]ft/i },
  { real: "paypal.com", pattern: /paypa[l1]|paypai|payp[a@]l/i },
  { real: "amazon.com", pattern: /amaz[o0]n|amazo[n7]|amzon/i },
  { real: "apple.com", pattern: /app[l1]e|appl[e3]|aple/i },
];

export function analyzeDomain(emailAddress: string): DomainAnalysis {
  const domain = emailAddress.split("@").pop()?.toLowerCase() || "";
  const flags: string[] = [];
  let riskScore = 0;

  const tld = "." + domain.split(".").pop();
  const suspiciousTld = SUSPICIOUS_TLDS.has(tld);
  if (suspiciousTld) {
    flags.push(`Suspicious TLD: ${tld}`);
    riskScore += 20;
  }

  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  if (isDisposable) {
    flags.push("Disposable email provider");
    riskScore += 40;
  }

  const isFreeProvider = FREE_EMAIL_PROVIDERS.has(domain);

  let hasTyposquatting = false;
  for (const target of TYPOSQUAT_TARGETS) {
    if (domain !== target.real && target.pattern.test(domain)) {
      hasTyposquatting = true;
      flags.push(`Possible typosquat of ${target.real}`);
      riskScore += 35;
      break;
    }
  }

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain.split(":")[0])) {
    flags.push("IP-based domain");
    riskScore += 25;
  }

  return {
    domain,
    isDisposable,
    isFreeProvider,
    hasTyposquatting,
    suspiciousTld,
    riskScore: Math.min(100, riskScore),
    flags,
  };
}

/**
 * Analyze domains extracted from a list of URLs.
 */
export function analyzeDomainsFromUrls(urls: string[]): Map<string, DomainAnalysis> {
  const results = new Map<string, DomainAnalysis>();
  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.toLowerCase();
      if (!results.has(domain)) {
        results.set(domain, analyzeDomain(`user@${domain}`));
      }
    } catch {
      // Skip malformed URLs
    }
  }
  return results;
}
