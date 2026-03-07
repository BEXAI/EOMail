# Render Environment Configuration Guide

⚠️ **SECURITY FIRST**: Never commit `.env` files with real API keys to git. Use Render's dashboard instead.

## Environment Variables Required for Render

### Step 1: Access Your Render Service

1. Go to [render.com](https://render.com)
2. Navigate to your **eomail** service
3. Click the **Environment** tab

### Step 2: Add Environment Variables

Add these variables one by one (values provided below):

| Variable | Required | Source |
|----------|----------|--------|
| `RESEND_API_KEY` | ✅ Yes | Resend Dashboard |
| `RESEND_WEBHOOK_SECRET` | ✅ Yes | You create this |
| `OPENAI_API_KEY` | ✅ Yes | OpenAI Dashboard |
| `DATABASE_URL` | ✅ Yes | Auto-populated by Render |
| `NODE_ENV` | ✅ Yes | Set to `production` |
| `PORT` | ✅ Yes | Set to `3000` |
| `DOMAIN` | ✅ Yes | Your Render domain |
| `SESSION_SECRET` | ✅ Yes | Generate a random string |

### Step 3: Configure Each Variable

#### **RESEND_API_KEY**
- Get from: [Resend Dashboard](https://resend.com/api-keys)
- Value: `re_GCpwwHW5_D2QGkpgoyTdDGa15rJHogAFi`
- ⚠️ Keep this private!

#### **RESEND_WEBHOOK_SECRET**
- Generate: Create a random string (32+ characters)
- Value: Use same secret as in Resend webhook configuration
- You'll need this to set up the webhook below

#### **OPENAI_API_KEY**
- Get from: [OpenAI API Keys](https://platform.openai.com/api-keys)
- Format: `sk-...` (usually starts with `sk-`)
- ⚠️ Keep this private!

#### **DATABASE_URL**
- Automatically populated by Render from PostgreSQL service
- Format: `postgresql://user:password@hostname:port/dbname`
- ✅ Already handled by Render Blueprint

#### **NODE_ENV**
- Value: `production`

#### **PORT**
- Value: `3000`

#### **DOMAIN**
- Value: Your Render domain (e.g., `eomail.onrender.com`)
- Update after Render assigns your domain

#### **SESSION_SECRET**
- Generate a secure random string
- Unix command: `openssl rand -base64 32`
- Store safely, never share

### Step 4: Set Up Resend Webhook

After deploying to Render:

1. Go to [Resend Dashboard](https://resend.com/webhooks)
2. Create a new webhook
3. **Webhook URL**: `https://your-render-app-url/api/email/inbound`
   - Replace with your actual Render URL (e.g., `https://eomail.onrender.com/api/email/inbound`)
4. **Webhook Secret**: Use the same value as `RESEND_WEBHOOK_SECRET`
5. **Events**: Select "Email received"
6. Save

### Step 5: Redeploy

1. In Render dashboard, click **Manual Deploy**
2. Wait for deployment to complete
3. Test the application at your Render URL

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Never commit real API keys to git
- [ ] Use `.env.example` for templating only
- [ ] All secrets are stored in Render's Environment tab
- [ ] `SESSION_SECRET` is a strong random string
- [ ] Resend webhook is configured with correct URL
- [ ] OpenAI API key is valid and has proper permissions
- [ ] Domain is updated in DOMAIN variable after deployment

## Troubleshooting

### "API key is invalid"
- Verify the key is copied correctly (no extra spaces)
- Check the key hasn't been revoked in the provider's dashboard
- Make sure you're using the right environment (production vs development keys)

### "Webhook not working"
- Verify the webhook URL is correct in Resend
- Check that `RESEND_WEBHOOK_SECRET` matches in Render and Resend
- Look at Render logs for webhook errors
- Verify the webhook is enabled in Resend dashboard

### "Database connection failed"
- Render PostgreSQL service may still be starting (can take 1-2 minutes)
- Check DATABASE_URL is properly set
- Verify PostgreSQL service is running in Render

## Local Development

For local testing, create a `.env.local` file:

```bash
# .env.local (never commit this!)
DATABASE_URL=postgresql://localhost:5432/eomail
OPENAI_API_KEY=sk_test_...
RESEND_API_KEY=re_test_...
RESEND_WEBHOOK_SECRET=whsec_test_...
NODE_ENV=development
PORT=5000
DOMAIN=localhost:5000
SESSION_SECRET=dev-secret-change-me
```

Then run: `npm run dev`
