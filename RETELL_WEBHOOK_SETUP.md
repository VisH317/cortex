# Retell AI Webhook Setup Guide

## 🔧 Step-by-Step Setup

### 1. Start Your Development Server
```bash
npm run dev
# Server should be running on http://localhost:3000
```

### 2. Start ngrok
```bash
ngrok http 3000
```

You'll see output like:
```
Session Status: online
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

**Important:** Copy the `https://` URL (e.g., `https://abc123.ngrok.io`)

### 3. Test the Webhook Endpoint
Open your browser or use curl to test:
```bash
curl https://YOUR_NGROK_URL/api/retell/webhook
```

You should see:
```json
{
  "message": "Retell webhook endpoint is active",
  "timestamp": "2024-...",
  "endpoint": "/api/retell/webhook"
}
```

### 4. Configure in Retell AI Dashboard

1. Go to **https://dashboard.retellai.com**
2. Navigate to your agent settings
3. Find the **Webhook URL** field
4. Enter: `https://YOUR_NGROK_URL/api/retell/webhook`
   - Example: `https://abc123.ngrok.io/api/retell/webhook`
5. Make sure to use **HTTPS** (not HTTP)
6. **Save** the configuration

### 5. Test with a Phone Call

1. Make a test call using the Retell dashboard or your app
2. Watch your terminal/console for logs like:

```
============================================================
🔔 RETELL WEBHOOK RECEIVED
============================================================
Event type: call_started
Call ID: abc123...
Timestamp: 2024-...
```

3. End the call and you should see:
```
============================================================
🔔 RETELL WEBHOOK RECEIVED
============================================================
Event type: call_ended
Call ID: abc123...
[Retell Webhook] ✅ Transcript saved successfully
```

## 🐛 Troubleshooting

### Webhook Not Receiving Events

**Check #1: Is ngrok running?**
```bash
# Make sure you see active forwarding
ngrok http 3000
```

**Check #2: Is the webhook URL correct in Retell dashboard?**
- Must be `https://` not `http://`
- Must end with `/api/retell/webhook`
- ngrok URL changes every time you restart it (unless you have a paid plan)

**Check #3: Is your Next.js server running?**
```bash
npm run dev
# Should be running on port 3000
```

**Check #4: Check your server logs**
Look for the distinctive box:
```
============================================================
🔔 RETELL WEBHOOK RECEIVED
============================================================
```

If you don't see this, the webhook isn't reaching your server.

**Check #5: Test manually**
```bash
# Test with curl
curl -X POST https://YOUR_NGROK_URL/api/retell/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","call":{"call_id":"test123"}}'
```

You should see logs in your terminal.

### Webhook Receiving But Not Saving

**Check #1: Is the call long enough?**
The webhook skips saving if transcript is < 50 characters:
```
[Retell Webhook] Transcript too short or missing (length: X), skipping save
```

**Check #2: Check for errors**
Look for error logs:
```
❌ RETELL WEBHOOK ERROR
```

**Check #3: Verify environment variables**
Make sure these are set in `.env`:
```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Check #4: Check Supabase connection**
Make sure your Supabase credentials are correct.

## 📝 What the Webhook Does

When a call ends, the webhook:

1. ✅ Receives the `call_ended` event from Retell
2. ✅ Extracts patient ID and user ID from metadata
3. ✅ Generates an AI summary using GPT-4
4. ✅ Creates a formatted transcript document
5. ✅ Uploads to Supabase Storage
6. ✅ Creates a database record
7. ✅ Triggers embedding generation

The transcript appears in the patient's vault as a `.txt` file with:
- Call date and time
- Duration
- AI-generated summary
- Full transcript

## 🔐 Security Note

The webhook verifies the signature from Retell AI if the `retell-sdk` package is installed:

```bash
npm install retell-sdk
```

Without it, signature verification is skipped (only for development).

## 🚀 Production Setup

For production:

1. Deploy your app (Vercel, Railway, etc.)
2. Use your production URL in Retell dashboard
   - Example: `https://yourdomain.com/api/retell/webhook`
3. No need for ngrok
4. Install `retell-sdk` for signature verification

## 📊 Monitoring

Watch for these log patterns:

**Successful webhook:**
```
🔔 RETELL WEBHOOK RECEIVED
Event type: call_ended
✅ Transcript saved successfully
```

**Failed webhook:**
```
❌ RETELL WEBHOOK ERROR
Error: [error message]
```

## 💡 Common Mistakes

1. ❌ Putting the ngrok URL in your code files
   - ✅ Put it in the Retell dashboard

2. ❌ Using `http://` instead of `https://`
   - ✅ Always use `https://` (ngrok provides this)

3. ❌ Forgetting to update webhook URL when restarting ngrok
   - ✅ Free ngrok URLs change on restart

4. ❌ Not watching server logs
   - ✅ Keep terminal open to see webhook activity

## 🎯 Quick Checklist

- [ ] Next.js dev server running (`npm run dev`)
- [ ] ngrok running (`ngrok http 3000`)
- [ ] Webhook URL configured in Retell dashboard
- [ ] Using `https://` URL from ngrok
- [ ] URL ends with `/api/retell/webhook`
- [ ] Environment variables set (OPENAI_API_KEY, etc.)
- [ ] Watching server logs for webhook activity

---

If you're still having issues, check the server logs and look for the distinctive log boxes to see exactly where the webhook is failing.

