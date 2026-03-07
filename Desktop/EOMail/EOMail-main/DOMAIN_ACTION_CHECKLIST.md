# 🚀 Custom Domain Setup - Quick Action Checklist

## Your Custom Domain: **eomail.email.co**

---

## ✅ What's Already Done

- ✅ render.yaml updated with `DOMAIN: eomail.email.co`
- ✅ render.yaml updated with `NEXT_PUBLIC_APP_URL: https://eomail.email.co`
- ✅ Code committed and pushed to GitHub
- ✅ Documentation created (CUSTOM_DOMAIN_SETUP.md)

---

## 📋 What You Need to Do Now

### **TASK 1: Add Custom Domain in Render (5 min)**

```
1. Go to https://dashboard.render.com
2. Click "eomail" service
3. Click "Settings" tab
4. Scroll to "Custom Domains"
5. Click "Add Custom Domain"
6. Type: eomail.email.co
7. Click "Add Domain"

✏️ Note the Target: eomail-xxxxx.onrender.com
   (You'll need this for DNS)
```

**Status:** ⏳ PENDING

---

### **TASK 2: Configure DNS at EMAIL.co Registrar (10 min)**

```
1. Go to your registrar (GoDaddy, Namecheap, etc.)
2. Find DNS or Domain Management
3. Look for CNAME Records
4. Create new record:

   Subdomain: eomail
   Type: CNAME
   Value: [paste the target from Task 1]
   TTL: 3600

5. Save changes

⚠️ Important: Use exact target from Render!
```

**Status:** ⏳ PENDING

---

### **TASK 3: Verify Domain in Render (5-15 min)**

```
1. Go back to Render dashboard
2. In "Custom Domains" section
3. Click "Check DNS"
4. Wait for ✓ Domain verified
5. Wait for 🔒 SSL ready (1-2 min)

You'll see:
✓ Domain verified
✓ SSL certificate provisioning...
✓ Certificate ready
```

**Status:** ⏳ PENDING

---

### **TASK 4: Update Environment Variables in Render (2 min)**

```
In Render dashboard:
1. Click "eomail" service
2. Click "Environment" tab
3. Look for DOMAIN variable
4. Verify it says: eomail.email.co
5. Look for NEXT_PUBLIC_APP_URL
6. Verify it says: https://eomail.email.co
7. Click "Deploy" to apply
```

**Status:** ⏳ PENDING

---

### **TASK 5: Manual Deploy (3 min)**

```
1. In Render dashboard
2. Click "Deployments" tab
3. Click "Manual Deploy" button
4. Wait for ✓ Deploy successful
```

**Status:** ⏳ PENDING

---

### **TASK 6: Update Resend Webhook (2 min)**

```
1. Go to https://resend.com
2. Click "Webhooks"
3. Find your webhook for email inbound
4. Update URL to:
   https://eomail.email.co/api/email/inbound
5. Keep same webhook secret
6. Save and test
```

**Status:** ⏳ PENDING

---

### **TASK 7: Test Everything (5 min)**

```
In browser, visit: https://eomail.email.co

Verify:
✓ Page loads without SSL errors
✓ Green HTTPS lock icon visible
✓ Login page appears
✓ Can sign up for account
✓ Can send test email
✓ Email appears in inbox
✓ AI chat working
```

**Status:** ⏳ PENDING

---

## 🎯 Summary

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Add domain in Render | 5 min | ⏳ |
| 2 | Update DNS at registrar | 10 min | ⏳ |
| 3 | Verify domain in Render | 5-15 min | ⏳ |
| 4 | Update env vars in Render | 2 min | ⏳ |
| 5 | Manual deploy | 3 min | ⏳ |
| 6 | Update Resend webhook | 2 min | ⏳ |
| 7 | Test everything | 5 min | ⏳ |
| **TOTAL** | **All tasks** | **~40 min** | **⏳** |

---

## 🔑 Important URLs to Know

```
Render Dashboard:     https://dashboard.render.com
Resend Dashboard:     https://resend.com
Your App:             https://eomail.email.co
API Base:             https://eomail.email.co/api
```

---

## ⚠️ Common Gotchas

1. **DNS not updating?**
   - Wait 5-15 minutes (normal propagation time)
   - Try in incognito window
   - Clear browser cache
   - Check: whatsmydns.net

2. **SSL certificate warning?**
   - Wait 2-3 more minutes
   - Clear cache completely
   - Try different browser
   - Check Render logs for errors

3. **API calls failing?**
   - Make sure `NEXT_PUBLIC_APP_URL` is set
   - Verify backend is running
   - Check browser console for errors
   - Test: `curl https://eomail.email.co`

4. **Emails not receiving?**
   - Verify Resend webhook URL is updated
   - Check webhook is receiving events
   - Look at Render logs for webhook errors

---

## 📚 Documentation

Full details in: **CUSTOM_DOMAIN_SETUP.md**

---

## ✨ Once Complete

After all 7 tasks are done:

```
✅ eomail.email.co is live
✅ SSL/HTTPS working
✅ Database connected
✅ Emails being sent/received
✅ AI chat operational
✅ Analytics tracking
✅ Ready for production
```

**Time to go live: ~40 minutes total**

---

## 🚨 Need Help?

**Error? Check:**
1. CUSTOM_DOMAIN_SETUP.md → Troubleshooting section
2. Render logs → Deployments tab
3. Browser console → DevTools
4. Resend logs → Webhooks section

**Still stuck?**
- Render support: support.render.com
- Resend support: resend.com/support
- Check DNS: dig eomail.email.co CNAME

---

**Ready to start? Begin with TASK 1! 🚀**
