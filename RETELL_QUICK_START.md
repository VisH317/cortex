# Retell AI - Quick Start

## ✅ What's Been Created

### API Endpoints

1. **`POST /api/retell/call`** - Initiate phone calls to patients
2. **`POST /api/retell/webhook`** - Receive call events from Retell

### Features

✅ **Automated Phone Calls**
- Call any patient programmatically
- Pass patient context to AI agent
- Track call status and ID

✅ **Automatic Transcript Storage**
- Saves to patient vault as `.txt` file
- AI-generated summary (GPT-4)
- Full transcript included
- Automatic embedding generation
- Searchable in chat immediately

✅ **Webhook Processing**
- `call_started` - Call initiated
- `call_ended` - **Saves transcript automatically**
- `call_analyzed` - Post-call analysis

---

## 🚀 Setup (5 Minutes)

### Step 1: Get Retell AI Account

1. Sign up at https://www.retellai.com
2. Create an AI agent for medical consultations
3. Get a phone number
4. Copy your credentials

### Step 2: Add to `.env`

```bash
# Retell AI Configuration
RETELL_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RETELL_AGENT_ID=agent_xxxxxxxxxxxxxxxxxxxxxxxxx
RETELL_FROM_NUMBER=+18445550123
```

### Step 3: Configure Webhook

1. Go to Retell dashboard → **Webhooks**
2. Add webhook URL:
   ```
   https://your-domain.com/api/retell/webhook
   ```
3. Subscribe to events:
   - ✅ `call_started`
   - ✅ `call_ended`
   - ✅ `call_analyzed`

### Step 4: Test It

```bash
# Call a patient
curl -X POST http://localhost:3000/api/retell/call \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid-here",
    "phoneNumber": "+14155551234"
  }'
```

---

## 📞 How to Use

### From Code

```typescript
// Call a patient
const response = await fetch('/api/retell/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patientId: patientId,
    phoneNumber: '+14155551234'
  })
})

const result = await response.json()
console.log('Call ID:', result.callId)
```

### What Happens Automatically

1. **Call Initiated** → Patient receives call
2. **AI Conversation** → Retell agent talks to patient
3. **Call Ends** → Webhook fires
4. **Transcript Saved** → Stored in patient vault:
   ```
   consultation_2025-11-09_abc12345.txt
   ```
5. **AI Summary Generated** → GPT-4 summarizes call
6. **Embeddings Created** → Makes it searchable
7. **Available in Chat** → Patient can ask about it

---

## 📄 Transcript Format

Each saved transcript includes:

```
MEDICAL CONSULTATION TRANSCRIPT
Patient: John Doe
Date: Monday, November 9, 2025 at 2:30 PM
Call ID: call_abc123

==================================================
SUMMARY
==================================================

MAIN HEALTH CONCERNS:
• Patient reports persistent headaches
• Associated symptoms: nausea, light sensitivity

MEDICAL RECOMMENDATIONS:
1. Take ibuprofen 400mg every 6 hours
2. Rest in dark room
3. Call back if symptoms worsen

==================================================
FULL TRANSCRIPT
==================================================

[Full conversation here]
```

---

## 🔍 Chat Integration

Once saved, transcripts are **searchable in chat**:

```
User: "What did the doctor say about my headaches in that call?"

Agent: [Searches embeddings, finds transcript]
"Based on your recent consultation on November 9th, the doctor 
recommended ibuprofen 400mg every 6 hours and rest in a dark room..."
```

---

## 📊 Console Logs

### Successful Call
```
[Retell] Initiating call to patient: John Doe (+14155551234)
[Retell] Call initiated successfully: call_abc123
```

### Webhook Processing
```
=== RETELL WEBHOOK RECEIVED ===
Event type: call_ended
Call ID: call_abc123
[Retell Webhook] ✅ Call ended
[Retell Webhook] Transcript length: 1850
[Retell Webhook] Generating AI summary...
[Retell Webhook] File uploaded successfully
[Retell Webhook] Transcript saved successfully!
```

---

## 💰 Cost

- **~$0.50 per call** (Retell: ~$0.45-90 + OpenAI: ~$0.0005)
- **100 calls/month**: ~$50
- **Transcripts stored forever** in patient vault

---

## 🧪 Testing

### Test Webhook Locally

```bash
# Use ngrok
ngrok http 3000

# Test webhook
curl -X POST http://localhost:3000/api/retell/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call_ended",
    "call": {
      "call_id": "test_123",
      "transcript": "Doctor: Hello. Patient: Hi doctor...",
      "metadata": {
        "patient_id": "your-patient-uuid",
        "patient_name": "Test Patient",
        "user_id": "your-user-uuid"
      }
    }
  }'

# Check patient vault for new file!
```

---

## ⚠️ Troubleshooting

### "Retell AI not configured"
```bash
# Add to .env
RETELL_API_KEY=your-api-key
```

### Transcript not saving
1. Check webhook is configured in Retell dashboard
2. Verify patient_id in call metadata
3. Check console logs for errors
4. Ensure transcript length > 50 characters

### Webhook failing
```bash
# Check webhook is accessible
curl https://your-domain.com/api/retell/webhook

# Should return: {"success":true}
```

---

## 📚 Documentation

- **Complete Guide**: `RETELL_AI_INTEGRATION.md`
- **This Quick Start**: `RETELL_QUICK_START.md`
- **API Code**: `/src/app/api/retell/`

---

## ✅ Summary

**You Now Have:**
- ✅ Automated patient phone calls
- ✅ AI-powered consultations  
- ✅ Automatic transcript storage
- ✅ AI-generated summaries
- ✅ Full search integration
- ✅ Embedded in patient vault

**Setup Time**: 5 minutes  
**Cost**: ~$0.50/call  
**Status**: ✅ **READY TO USE**

Just add your Retell credentials and make your first call! 📞

