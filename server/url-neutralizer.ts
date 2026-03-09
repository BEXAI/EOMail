/**
 * Extract all URLs from an email body (handles both HTML and plain text).
 * Returns deduplicated array of URL strings.
 */
export function extractUrls(body: string): string[] {
  const urls = new Set<string>();

  // Extract href attributes from anchor tags
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(body)) !== null) {
    const url = match[1].trim();
    if (isValidUrl(url)) {
      urls.add(url);
    }
  }

  // Extract URLs from plain text
  const plainUrlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  while ((match = plainUrlRegex.exec(body)) !== null) {
    const url = match[0].replace(/[.,;!?]+$/, "");
    if (isValidUrl(url)) {
      urls.add(url);
    }
  }

  return Array.from(urls);
}

/**
 * Check if a string is a valid-looking URL (not a data: or javascript: URI).
 */
function isValidUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return false;
  if (lower.length < 10) return false;
  return true;
}

/**
 * Neutralize a URL by replacing the scheme with a safe marker.
 */
export function neutralizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, "hxxps://");
}

/**
 * Neutralize all URLs in a list.
 */
export function neutralizeUrls(urls: string[]): string[] {
  return urls.map(neutralizeUrl);
}
