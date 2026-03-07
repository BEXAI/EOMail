# EOMail Security Audit Report

**Date:** 2026-03-07
**Scope:** Full codebase (server, client, shared, configuration)

---

## Executive Summary

This audit examined the EOMail application for security vulnerabilities across authentication, input validation, injection attacks, session management, and client-side security. The application demonstrates generally solid security practices (ORM-based queries, bcrypt hashing, Zod validation, rate limiting), but several issues were identified and remediated.

---

## Findings & Remediations

### CRITICAL

#### 1. XSS via `dangerouslySetInnerHTML` in Email List (FIXED)
- **File:** `client/src/components/email-list.tsx:291,363,370`
- **Issue:** `highlightText()` rendered email sender names, subjects, and previews using `dangerouslySetInnerHTML`. While `escapeHtml()` was applied, it did not use DOMPurify — leaving a gap if the escape function missed edge cases.
- **Fix:** Added DOMPurify sanitization as defense-in-depth within `highlightText()`.

#### 2. Weak Password Policy (FIXED)
- **Files:** `server/auth.ts:101`, `client/src/pages/auth.tsx:141`, `client/src/pages/reset-password.tsx:30`
- **Issue:** Minimum password length was 6 characters — too weak for production use.
- **Fix:** Increased minimum password length to 12 characters across both server and client validation.

#### 3. Timing-Unsafe Webhook Secret Comparison (FIXED)
- **File:** `server/routes.ts:573`
- **Issue:** Webhook secret compared using `!==` (string equality), which is vulnerable to timing attacks.
- **Fix:** Replaced with `crypto.timingSafeEqual()` for constant-time comparison.

### HIGH

#### 4. No Account Lockout on Failed Logins (FIXED)
- **File:** `server/auth.ts`
- **Issue:** No mechanism to prevent brute-force login attacks beyond rate limiting.
- **Fix:** Added in-memory login attempt tracking — accounts lock after 5 failed attempts within a 15-minute window.

#### 5. User Enumeration via Registration (FIXED)
- **File:** `server/auth.ts:107`
- **Issue:** Registration returned "Username already taken" — allowing attackers to enumerate valid usernames.
- **Fix:** Changed to generic message: "An account with this username or email already exists".

#### 6. Missing CSP Directives (FIXED)
- **File:** `server/index.ts:17-31`
- **Issue:** CSP was missing `frame-ancestors`, `form-action`, `base-uri`, and `object-src` directives. No `Referrer-Policy` header.
- **Fix:** Added `frameAncestors: ['none']`, `formAction: ['self']`, `baseUri: ['self']`, `objectSrc: ['none']`, and `referrerPolicy: 'strict-origin-when-cross-origin'`.

### MEDIUM (Not Fixed — Recommendations)

#### 7. `unsafe-inline` in Script CSP
- **File:** `server/index.ts:22`
- **Issue:** `'unsafe-inline'` in `scriptSrc` weakens CSP. Ideally use nonce-based CSP.
- **Recommendation:** Implement nonce-based script CSP when build tooling supports it.

#### 8. In-Memory Rate Limiter Store
- **File:** `server/routes.ts:14-36`
- **Issue:** Rate limiter uses default in-memory store — resets on server restart.
- **Recommendation:** Use Redis-backed store for rate limiting persistence.

#### 9. Session Cookie `sameSite: "lax"`
- **File:** `server/auth.ts:49`
- **Issue:** `"lax"` allows cookies on top-level navigations from external sites. `"strict"` is safer for apps that don't need cross-site cookie sending.
- **Recommendation:** Consider upgrading to `"strict"` if cross-site navigation with authenticated state is not needed.

#### 10. No CSRF Token Validation
- **Issue:** Application relies on `sameSite` cookie attribute for CSRF protection. While JSON API endpoints are naturally resistant (browsers enforce CORS for `Content-Type: application/json`), explicit CSRF tokens add defense-in-depth.
- **Recommendation:** Implement CSRF tokens for state-changing operations.

#### 11. WebSocket CSP Too Permissive
- **File:** `server/index.ts:26`
- **Issue:** `connectSrc` allows `ws:` and `wss:` to any host.
- **Recommendation:** Restrict to specific WebSocket host.

#### 12. Webhook Accepts Secret via Query Parameter
- **File:** `server/routes.ts:573`
- **Issue:** `req.query.secret` fallback exposes the secret in URL/server logs.
- **Recommendation:** Only accept webhook secret via `x-webhook-secret` header.

### LOW

#### 13. No Password Complexity Requirements
- Passwords only enforce minimum length, not character diversity.
- **Recommendation:** Require mix of uppercase, lowercase, numbers, and special characters.

#### 14. Session Duration (30 Days)
- **File:** `server/auth.ts:46`
- Long-lived sessions increase window for session hijacking.
- **Recommendation:** Consider shorter sessions with refresh mechanism.

#### 15. API Response Logging Includes Full JSON Bodies
- **File:** `server/index.ts:72`
- Logged response bodies could contain sensitive user data.
- **Recommendation:** Redact or limit response body logging.

---

## What's Working Well

| Area | Implementation | Status |
|------|---------------|--------|
| SQL Injection Prevention | Drizzle ORM with parameterized queries | Secure |
| Password Hashing | bcrypt with salt rounds of 10 | Secure |
| Input Validation | Zod schemas with strict mode on all endpoints | Secure |
| Rate Limiting | express-rate-limit on auth (10/15min), API (100/min), AI (50/hr) | Good |
| PII Redaction | Regex-based PII stripping before LLM processing | Good |
| Session Storage | PostgreSQL-backed sessions (not in-memory) | Secure |
| Cookie Security | httpOnly, secure (production), sameSite | Good |
| Error Handling | Generic messages to clients, detailed logs server-side | Good |
| Email HTML Sanitization | DOMPurify on email body rendering | Secure |
| Password Reset Tokens | crypto.randomBytes(32) with 1-hour expiry | Secure |
| Forgot Password | Non-enumerable response ("If an account exists...") | Secure |

---

## Files Modified in This Audit

| File | Changes |
|------|---------|
| `server/auth.ts` | Account lockout, stronger password policy, fix user enumeration |
| `server/routes.ts` | Timing-safe webhook secret comparison |
| `server/index.ts` | Enhanced CSP directives, referrer policy |
| `client/src/components/email-list.tsx` | DOMPurify sanitization on highlighted text |
| `client/src/pages/auth.tsx` | Updated password length validation to 12 |
| `client/src/pages/reset-password.tsx` | Updated password length validation to 12 |
