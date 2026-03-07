# EOMail MVP Deployment Plan

> Domain: **eomail.co** | Platform: **Render.com** | Email: **Resend**
> Updated: March 7, 2026

---

## Issues Found

### 1. Build Failure on Render
```
> rest-express@1.0.0 build
> tsx script/build.ts
sh: 1: tsx: not found
==> Build failed
```
**Cause:** `tsx` is a devDependency. Render runs `npm ci` which installs devDependencies by default, but the `build` script called `tsx` directly instead of `npx tsx`.
**Fix:** Updated `package.json` scripts to use `npx tsx` (applied).

### 2. DNS Misconfiguration (GoDaddy)
| Record | Value | Issue |
|--------|-------|-------|
| A `eomail` | `74.220.48.0`, `74.220.56.0` | GoDaddy parking IPs - will NOT reach Render |
| CNAME `www` | `eomail.onrender.com` | Correct target but only covers `www.eomail.co` |
| TXT `@` | `replit-verify=...` | Stale Replit verification - should remove |

**Missing:** No A/CNAME record for root domain `eomail.co` pointing to Render.

### 3. Domain Mismatch
`render.yaml` had `DOMAIN=eomail.email.co` but the actual domain is `eomail.co`.
**Fix:** Updated `render.yaml` to use `eomail.co` (applied).

---

## Step-by-Step Deployment Plan

### Phase 1: Fix Codebase (Local)

- [x] **1.1** Update `package.json` build script to use `npx tsx`
- [x] **1.2** Update `render.yaml` DOMAIN from `eomail.email.co` to `eomail.co`
- [x] **1.3** Update `render.yaml` NEXT_PUBLIC_APP_URL to `https://eomail.co`
- [ ] **1.4** Commit and push changes to GitHub `main` branch

```bash
cd /Users/nathaniel/Desktop/EOMail/EOMail-main
git add package.json render.yaml
git commit -m "Fix build scripts and correct domain to eomail.co"
git push origin main
```

### Phase 2: Fix GoDaddy DNS Records

Go to: **GoDaddy > My Domains > eomail.co > DNS Management**

#### Records to DELETE:
| Type | Name | Value | Reason |
|------|------|-------|--------|
| A | `eomail` | `74.220.48.0` | GoDaddy parking IP, not Render |
| A | `eomail` | `74.220.56.0` | GoDaddy parking IP, not Render |
| TXT | `@` | `replit-verify=e4ffc278...` | Old Replit verification, no longer needed |

#### Records to ADD:
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `@` | `eomail.onrender.com` | 1 Hour |

> **Note:** GoDaddy may not allow CNAME on root domain (`@`). If so, use one of these alternatives:
>
> **Option A — Use www subdomain as primary:**
> - Keep existing CNAME `www` -> `eomail.onrender.com`
> - Add a GoDaddy "Forwarding" rule: `eomail.co` -> `https://www.eomail.co` (301 redirect)
> - Update Render env vars: `DOMAIN=www.eomail.co`, `NEXT_PUBLIC_APP_URL=https://www.eomail.co`
>
> **Option B — Use A record with Render IP:**
> 1. In Render Dashboard, go to your `eomail` service > Settings > Custom Domains
> 2. Add `eomail.co` as a custom domain
> 3. Render will provide an IP address for A records
> 4. In GoDaddy, replace the parking A records with Render's IP

#### Records to KEEP (Email/Resend - already correct):
| Type | Name | Value | Status |
|------|------|-------|--------|
| MX | `@` | `inbound.resend.com` (Priority 10) | OK |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (Priority 10) | OK |
| TXT | `resend._domainkey` | DKIM public key | OK |
| TXT | `send` | `v=spf1 include:...` | OK |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine` | OK |
| TXT | `dc-fd741b8612._spfm.send` | SPF include for SES | OK |

### Phase 3: Render.com Configuration

#### 3.1 Add Custom Domain
1. Go to **Render Dashboard > eomail service > Settings**
2. Scroll to **Custom Domains**
3. Click **Add Custom Domain**
4. Enter: `eomail.co`
5. Render will show you the required DNS records (use these in Phase 2)
6. Wait for SSL certificate provisioning (can take up to 30 minutes)

#### 3.2 Verify Environment Variables
In **Render Dashboard > eomail service > Environment**, confirm these are set:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Set by render.yaml |
| `PORT` | `10000` | Set by render.yaml |
| `DATABASE_URL` | (auto from eomail-db) | Set by render.yaml |
| `SESSION_SECRET` | (auto-generated) | Set by render.yaml |
| `DOMAIN` | `eomail.co` | Updated in render.yaml |
| `NEXT_PUBLIC_APP_URL` | `https://eomail.co` | Updated in render.yaml |
| `OPENAI_API_KEY` | `sk-...` | Must set manually |
| `RESEND_API_KEY` | `re_...` | Must set manually |
| `RESEND_WEBHOOK_SECRET` | `whsec_...` | Must set manually |

#### 3.3 Trigger Redeploy
After pushing the code fix:
1. Go to **Render Dashboard > eomail service**
2. Click **Manual Deploy > Deploy latest commit**
3. Watch the build logs — should no longer fail on `tsx: not found`

### Phase 4: Resend Configuration

#### 4.1 Verify Domain in Resend
1. Go to **resend.com/domains**
2. Confirm `eomail.co` is verified (DNS records from Phase 2 handle this)
3. If not verified, re-check MX, SPF, DKIM, and DMARC records

#### 4.2 Configure Inbound Webhook
1. Go to **resend.com/webhooks**
2. Create or update webhook:
   - **URL:** `https://eomail.co/api/email/inbound`
   - **Secret:** Same value as `RESEND_WEBHOOK_SECRET` env var on Render
   - **Events:** Select `email.received`

### Phase 5: Post-Deployment Verification

Run through this checklist after deployment succeeds:

- [ ] **App loads:** Visit `https://eomail.co` — should see login/register page
- [ ] **SSL works:** Verify HTTPS padlock icon, no certificate warnings
- [ ] **Registration:** Create a test account
- [ ] **Login:** Log in with the test account
- [ ] **Send email:** Compose and send a test email via the app
- [ ] **Receive email:** Send an email TO `test@eomail.co` and verify it appears in inbox
- [ ] **AI features:** Test AI summary, draft reply, and AI chat
- [ ] **Folders:** Create a custom folder, move an email into it
- [ ] **Mobile:** Check responsive layout on phone

---

## Post-MVP Improvements

After the MVP is live, consider these enhancements:

1. **Remove `db:push` from build command** — run schema migrations manually via Render Shell
2. **Fix hardcoded domain references:**
   - `server/ai-pipeline.ts:61` — `me@eomail.co` comparison
   - `client/src/components/app-sidebar.tsx:512` — fallback placeholder
   - `server/system-wrapper/prompt-orchestrator.ts:283` — AI prompt text
3. **Add health check endpoint** — Render can auto-restart unhealthy services
4. **Upgrade from free tier** — free Render PostgreSQL expires after 90 days
5. **Set up monitoring** — add error tracking (Sentry) and uptime monitoring

---

## Quick Reference

| Service | URL |
|---------|-----|
| App | `https://eomail.co` |
| Render Dashboard | `https://dashboard.render.com` |
| Resend Dashboard | `https://resend.com` |
| GoDaddy DNS | `https://dcc.godaddy.com/manage/eomail.co/dns` |
| GitHub Repo | `https://github.com/BEXAI/EOMail` |
