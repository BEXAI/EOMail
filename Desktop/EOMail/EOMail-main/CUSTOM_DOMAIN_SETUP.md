# Custom Domain Setup: eomail.email.co

This guide configures EOMail to run on your custom domain **eomail.email.co** using Render's free tier with automatic SSL/HTTPS.

---

## 🎯 Final Configuration

**Your application will be accessible at:**
```
https://eomail.email.co
```

**What you get:**
- ✅ Custom domain (eomail.email.co)
- ✅ Free SSL certificate (auto-renewed)
- ✅ Automatic HTTPS redirect
- ✅ Free tier Render hosting
- ✅ Free PostgreSQL database

---

## 📋 Prerequisites

- ✅ EMAIL.co domain registered and active
- ✅ Access to domain registrar's DNS settings
- ✅ Render account with eomail service deployed
- ✅ GitHub repo synced

---

## 🚀 Step-by-Step Setup

### **Step 1: Add Custom Domain in Render (5 min)**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **eomail** service
3. Navigate to **Settings** tab
4. Scroll to **Custom Domains** section
5. Click **Add Custom Domain**
6. Enter: `eomail.email.co`
7. Click **Add Domain**

**Render will display:**
```
✓ Domain: eomail.email.co
📍 Status: Awaiting CNAME configuration
🎯 Target: eomail-xxxxx.onrender.com
```

Keep this tab open - you'll need the target domain.

---

### **Step 2: Configure DNS Records (10 min)**

Go to your domain registrar (GoDaddy, Namecheap, Route53, etc.):

**For most registrars (GoDaddy, Namecheap, etc.):**

1. Log in to your domain control panel
2. Go to **DNS Settings** or **Manage DNS**
3. Find **CNAME Records** section
4. Create new CNAME record:

```
Subdomain: eomail
Type:      CNAME
Value:     eomail-xxxxx.onrender.com (from Step 1)
TTL:       3600 (1 hour)
```

**If CNAME not available, use A Record:**

```
Subdomain: eomail
Type:      A
Value:     [Get from Render dashboard]
TTL:       3600
```

**Save the DNS record.**

---

### **Step 3: Verify Domain in Render (5-15 min)**

1. Return to Render dashboard
2. Click **Check DNS** button
3. Wait for verification (usually instant, up to 15 minutes)

**When verified, you'll see:**
```
✓ Domain verified
🔒 SSL certificate provisioning...
⏳ Certificate ready in 1-2 minutes
```

---

### **Step 4: Update Environment Variables in Render**

In Render dashboard → **eomail** service → **Environment** tab:

Update these variables:

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `DOMAIN` | `eomail.co` | `eomail.email.co` |
| `NEXT_PUBLIC_APP_URL` | (not set) | `https://eomail.email.co` |

Click **Deploy** to apply changes.

---

### **Step 5: Deploy & Test (5 min)**

1. Go to **eomail** service → **Deployments**
2. Click **Manual Deploy**
3. Wait for deployment to complete (2-3 minutes)
4. Visit: `https://eomail.email.co`

**Expected behavior:**
```
✓ Page loads with green HTTPS lock
✓ No SSL certificate warnings
✓ All API endpoints working
✓ Database connected and responsive
```

---

## 🔐 SSL/HTTPS Configuration

Render automatically:
- ✅ Issues free SSL certificate via Let's Encrypt
- ✅ Redirects HTTP → HTTPS
- ✅ Auto-renews certificate before expiration
- ✅ Sets security headers (HSTS, CSP, etc.)

No additional configuration needed!

---

## 📧 Email Configuration for Resend

Update Resend webhook to use your custom domain:

1. Go to [Resend Dashboard](https://resend.com)
2. Navigate to **Webhooks**
3. Update webhook URL:

```
Old: https://eomail.onrender.com/api/email/inbound
New: https://eomail.email.co/api/email/inbound
```

4. Keep the same webhook secret
5. Test webhook delivery

---

## 🔄 API Endpoints with Custom Domain

All API calls will now use:

```
https://eomail.email.co/api/...
```

Examples:
```
POST   https://eomail.email.co/api/auth/login
GET    https://eomail.email.co/api/emails
POST   https://eomail.email.co/api/email/send
GET    https://eomail.email.co/api/agent/chat
```

Frontend will automatically use this domain (from `NEXT_PUBLIC_APP_URL` env var).

---

## 🛠️ Troubleshooting

### Domain not verifying after 15 minutes

**Solution:**
1. Check DNS records are correct
2. Clear browser cache
3. Try `nslookup eomail.email.co` in terminal
4. Wait another 5-10 minutes (DNS propagation)

### SSL certificate warning

**Solution:**
1. Clear browser cache completely
2. Try incognito window
3. Wait 2-3 more minutes for certificate
4. If still failing: contact Render support

### 404 errors on custom domain

**Solution:**
1. Verify `DOMAIN` env var is set correctly
2. Run `Manual Deploy` in Render
3. Check server logs for errors
4. Verify app is running: `curl https://eomail.email.co`

### API calls failing

**Solution:**
1. Verify `NEXT_PUBLIC_APP_URL` is set
2. Check CORS headers in server
3. Verify backend is running
4. Check browser console for exact error

---

## 📊 Verification Checklist

After setup, verify everything works:

- [ ] `https://eomail.email.co` loads without SSL errors
- [ ] Green HTTPS lock visible in browser
- [ ] Login/registration works
- [ ] Can send/receive emails via Resend
- [ ] AI chat endpoints responding
- [ ] Database queries working
- [ ] Analytics logging events
- [ ] Resend webhook receiving emails

---

## 🔄 Future Domain Changes

To change domain in the future:

1. Add new custom domain in Render
2. Update DNS records
3. Update `DOMAIN` and `NEXT_PUBLIC_APP_URL` env vars
4. Update Resend webhook URL
5. Deploy

---

## 💡 DNS Propagation Tips

DNS changes can take 5 minutes to 48 hours to fully propagate globally:

**Speed it up:**
1. Set TTL to 300 (5 minutes) during setup
2. After verification, increase to 3600
3. Check propagation: [whatsmydns.net](https://whatsmydns.net)
4. Use `dig` command: `dig eomail.email.co CNAME`

---

## 📞 Support

If domain setup fails:

1. Check Render logs: **Deployments** tab
2. Verify DNS: `nslookup eomail.email.co`
3. Contact Render: [support.render.com](https://support.render.com)
4. Contact registrar DNS support

---

## ✅ What's Next

After domain is verified:

1. Update Resend webhook URL
2. Test email receiving/sending
3. Test AI chat endpoints
4. Monitor Render dashboard for usage
5. Check PostgreSQL disk usage (free tier limit: 1GB)
6. Set up monitoring/alerts

---

**Your EOMail is now live on your custom domain! 🎉**
