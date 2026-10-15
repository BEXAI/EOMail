// Usernames become the local part of a user's address (username@eomail.co),
// so they must be valid, unambiguous email local parts.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

// System and role addresses that must never be claimable by a user,
// since inbound mail is routed to whichever account owns the address.
const RESERVED = new Set([
  "admin", "administrator", "root", "postmaster", "hostmaster", "webmaster",
  "abuse", "security", "support", "help", "info", "contact", "noreply",
  "no-reply", "welcome", "billing", "mail", "mailer-daemon", "team",
  "eomail", "system", "staff", "api", "www",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns an error message, or null if the (normalized) username is valid. */
export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters`;
  if (username.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters`;
  if (!/^[a-z0-9._-]+$/.test(username)) return "Use only letters, numbers, dots, hyphens, and underscores";
  if (!/^[a-z0-9]/.test(username) || !/[a-z0-9]$/.test(username)) return "Username must start and end with a letter or number";
  if (/[._-]{2}/.test(username)) return "Username can't contain consecutive dots, hyphens, or underscores";
  if (RESERVED.has(username)) return "That username is reserved";
  return null;
}
