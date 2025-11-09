# Retell AI Integration

## Overview

The system now integrates with Retell AI to enable automated phone calls to patients with AI-powered medical consultations. Call transcripts are automatically saved to the patient's vault with AI-generated summaries and full embedding support for future reference.

**Access Method**: Doctors can initiate calls via a **UI button** in the patient header (next to phone number) or programmatically via API.

## Features

### 1. ✅ Initiate Phone Calls
- **UI Button**: One-click calling from patient header
- **API Access**: Programmatic API to start calls
- Configurable agent and phone number
- Metadata passing for patient context

### 2. ✅ Automatic Transcript Storage
- Saves call transcripts to patient vault
- Generates AI summary using GPT-4
- Creates formatted document with both summary and transcript
- Triggers embedding generation for searchability

### 3. ✅ Webhook Processing
- Handles `call_started`, `call_ended`, `call_analyzed` events
- Non-blocking, doesn't fail on errors
- Comprehensive logging for monitoring

## Setup

### 1. Get Retell AI Credentials

Sign up at [Retell AI](https://www.retellai.com/) and get:
- API Key
- Agent ID (create an agent for medical consultations)
- Phone number (Retell-provided)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Retell AI Configuration
RETELL_API_KEY=your-retell-api-key-here
RETELL_AGENT_ID=agent_xxxxxxxxxxxxxx
RETELL_FROM_NUMBER=+18445550123
```

### 3. Configure Webhook in Retell Dashboard

1. Go to Retell AI dashboard
2. Navigate to **Webhooks** settings
3. Add webhook URL: `https://your-domain.com/api/retell/webhook`
4. Subscribe to events:
   - `call_started`
   - `call_ended`
   - `call_analyzed`

### 4. Test Setup

```bash
# Restart your server
npm run dev

# Test with curl
curl -X POST http://localhost:3000/api/retell/call \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid-here",
    "phoneNumber": "+14155551234"
  }'
```

## API Reference

### Initiate Call

**Endpoint:** `POST /api/retell/call`

**Request Body:**
```typescript
{
  patientId: string       // Required: UUID of patient to call
  phoneNumber: string     // Required: E.164 format (+14155551234)
  agentId?: string        // Optional: Override default agent
}
```

**Response:**
```typescript
{
  success: boolean
  callId: string          // Retell call ID
  status: string          // Call status
  message: string         // Human-readable message
}
```

**Example:**
```typescript
const response = await fetch('/api/retell/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patientId: '123e4567-e89b-12d3-a456-426614174000',
    phoneNumber: '+14155551234'
  })
})

const result = await response.json()
console.log('Call ID:', result.callId)
```

### Webhook Events

**Endpoint:** `POST /api/retell/webhook` (called by Retell AI)

**Event Types:**

#### 1. `call_started`
Triggered when call is connected.

```json
{
  "event": "call_started",
  "call": {
    "call_id": "call_abc123",
    "to_number": "+14155551234",
    "from_number": "+18445550123",
    "call_status": "in-progress",
    "metadata": {
      "patient_id": "...",
      "patient_name": "John Doe",
      "user_id": "..."
    }
  }
}
```

#### 2. `call_ended`
Triggered when call ends. **Automatically saves transcript.**

```json
{
  "event": "call_ended",
  "call": {
    "call_id": "call_abc123",
    "transcript": "Doctor: Hello, how are you feeling today? Patient: I've been...",
    "call_analysis": {
      "call_duration_ms": 180000,
      "user_sentiment": "neutral"
    },
    "metadata": {
      "patient_id": "...",
      "patient_name": "John Doe",
      "user_id": "..."
    }
  }
}
```

**What Happens:**
1. Generates AI summary using GPT-4
2. Creates formatted document with summary + transcript
3. Uploads to Supabase Storage
4. Creates file record in database
5. Triggers embedding generation
6. Patient can now search call content in chat

#### 3. `call_analyzed`
Triggered when Retell finishes analyzing the call.

```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "call_abc123",
    "call_analysis": {
      "call_successful": true,
      "call_duration_ms": 180000,
      "user_sentiment": "positive",
      "in_voicemail": false
    }
  }
}
```

## Architecture

### Call Flow

```
Doctor/System
     ↓
POST /api/retell/call
     ↓
Verify Patient & Auth
     ↓
Call Retell API
     ↓
Retell Initiates Call → Patient's Phone
     ↓
AI Agent Conversation
     ↓
Call Ends
     ↓
Retell Webhook → POST /api/retell/webhook
     ↓
Generate AI Summary (GPT-4)
     ↓
Create Document (Summary + Transcript)
     ↓
Upload to Supabase Storage
     ↓
Create File Record
     ↓
Trigger Embedding Generation
     ↓
✅ Transcript Searchable in Chat
```

### Transcript Document Format

```
MEDICAL CONSULTATION TRANSCRIPT
Patient: John Doe
Date: Monday, November 9, 2025 at 2:30 PM
Call ID: call_abc123

==================================================
SUMMARY
==================================================

MAIN HEALTH CONCERNS:
• Patient reports persistent headaches for 3 days
• Associated with nausea and light sensitivity
• No fever or recent head trauma

SYMPTOMS REPORTED:
• Headache severity: 7/10
• Location: Bilateral, frontal
• Duration: 3 days, constant
• Triggers: Bright lights, loud noises

MEDICAL RECOMMENDATIONS:
1. Take ibuprofen 400mg every 6 hours
2. Rest in dark, quiet room
3. Stay hydrated
4. Avoid screens for 24 hours

MEDICATIONS SUGGESTED:
• Ibuprofen 400mg every 6 hours (max 3 days)
• If no improvement, consider sumatriptan

FOLLOW-UP INSTRUCTIONS:
• Call back if symptoms worsen
• Schedule appointment if not improved in 3 days
• Go to ER if experiencing vision changes or severe symptoms

==================================================
FULL TRANSCRIPT
==================================================

Doctor: Hello, this is Dr. Smith. How are you feeling today?

Patient: Hi Doctor, I've been having these really bad headaches...

[Full conversation continues...]

==================================================
END OF TRANSCRIPT
==================================================
```

## Integration with Chat Agent

### Automatic Search Integration

Once transcript is saved and embedded, the chat agent can:

```
User: "What did the doctor say about my headaches in that call?"

Agent: [Searches embeddings, finds transcript, provides answer]
"Based on your recent phone consultation, the doctor recommended..."
```

The transcript is treated like any other document:
- Chunked into ~250 token segments
- Embedded with OpenAI
- Stored in pgvector
- Searchable via semantic similarity

### Patient Context Enhancement

Future calls can reference past consultations:

```typescript
// When initiating call, pass context
{
  retell_llm_dynamic_variables: {
    patient_name: "John Doe",
    previous_consultations: "Patient called 3 days ago about headaches..."
  }
}
```

## Code Examples

### Example 1: Call Patient from Admin Panel

```typescript
// components/PatientCallButton.tsx
import { useState } from 'react'

export function PatientCallButton({ patientId, phoneNumber, patientName }) {
  const [calling, setCalling] = useState(false)

  const handleCall = async () => {
    setCalling(true)
    try {
      const response = await fetch('/api/retell/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, phoneNumber })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`Call initiated to ${patientName}!`)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      alert('Failed to initiate call')
    } finally {
      setCalling(false)
    }
  }

  return (
    <button onClick={handleCall} disabled={calling}>
      {calling ? 'Calling...' : 'Call Patient'}
    </button>
  )
}
```

### Example 2: Scheduled Follow-Up Calls

```typescript
// lib/scheduled-calls.ts
export async function scheduleFollowUpCall(
  patientId: string,
  phoneNumber: string,
  delayDays: number
) {
  const scheduledTime = new Date()
  scheduledTime.setDate(scheduledTime.getDate() + delayDays)

  // Store in database
  await db.scheduledCalls.create({
    patientId,
    phoneNumber,
    scheduledFor: scheduledTime,
    status: 'pending'
  })

  // Set up cron job or use service like Vercel Cron
}
```

### Example 3: Chat Agent Integration

```typescript
// In chat-agent.ts, add new tool
{
  type: "function",
  function: {
    name: "call_patient",
    description: "Initiate a phone call to the patient for urgent matters",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why the call is needed"
        }
      }
    }
  }
}

// Handle the function call
if (functionName === "call_patient") {
  const { reason } = functionArgs
  
  // Get patient phone number
  const { data: patient } = await supabase
    .from("patients")
    .select("phone")
    .eq("id", patientId)
    .single()

  if (patient?.phone) {
    // Initiate call
    await fetch('/api/retell/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        phoneNumber: patient.phone
      })
    })

    return `Call initiated to patient. Reason: ${reason}`
  }
}
```

## Monitoring & Debugging

### Console Logs

**Successful Call Initiation:**
```
[Retell] Initiating call to patient: John Doe (+14155551234)
[Retell] Call data: {"from_number":"+18445550123",...}
[Retell] Call initiated successfully: {"call_id":"call_abc123",...}
```

**Webhook Processing:**
```
=== RETELL WEBHOOK RECEIVED ===
Event type: call_ended
Call ID: call_abc123
[Retell Webhook] ✅ Call ended: call_abc123
[Retell Webhook] Transcript length: 1850
[Retell Webhook] Saving transcript to patient vault
[Retell Webhook] Generating AI summary...
[Retell Webhook] Summary generated, length: 650
[Retell Webhook] Uploading file to storage: user_123/patient_456/consultation_2025-11-09_call_abc1.txt
[Retell Webhook] File uploaded successfully
[Retell Webhook] File record created: file_uuid
[Retell Webhook] Transcript saved successfully!
```

### Database Verification

```sql
-- Check recent call transcripts
SELECT 
  f.name,
  f.description,
  f.created_at,
  p.name as patient_name
FROM files f
JOIN patients p ON f.patient_id = p.id
WHERE f.name LIKE 'consultation_%'
ORDER BY f.created_at DESC
LIMIT 10;

-- Check embedding status
SELECT 
  name,
  embedding_status,
  created_at
FROM files
WHERE name LIKE 'consultation_%'
AND embedding_status != 'completed';
```

## Error Handling

### Common Issues

**Issue: "Retell AI not configured"**
```
Solution: Add RETELL_API_KEY to .env
```

**Issue: Transcript not saving**
```
Check:
1. Webhook URL configured in Retell dashboard?
2. Patient ID in metadata?
3. Transcript length > 50 characters?
4. Check console logs for specific error
```

**Issue: Webhook signature verification failed**
```
Solution: Implement webhook signature verification:

const verifySignature = (signature: string, body: any): boolean => {
  const secret = process.env.RETELL_WEBHOOK_SECRET
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(JSON.stringify(body)).digest('hex')
  return signature === digest
}
```

## Security Considerations

1. **Webhook Verification**: Implement signature verification for production
2. **Rate Limiting**: Add rate limits to prevent abuse
3. **Phone Number Validation**: Validate E.164 format
4. **Patient Verification**: Always verify patient ownership before calling
5. **HIPAA Compliance**: Ensure Retell AI setup meets requirements

## Cost Estimates

### Retell AI Pricing (approximate)
- **Per minute**: $0.09/min
- **Average call**: 5-10 minutes
- **Cost per call**: ~$0.45 - $0.90

### OpenAI Costs
- **Summary generation**: ~$0.0001 per call
- **Transcript embedding**: ~$0.0004 per call
- **Total AI costs**: ~$0.0005 per call

### Monthly Estimate (100 calls)
- Retell: $45-$90
- OpenAI: $0.05
- **Total**: ~$45-$90/month

## Future Enhancements

- [ ] Scheduled follow-up calls
- [ ] Call recordings storage
- [ ] Real-time call monitoring dashboard
- [ ] Multi-language support
- [ ] Sentiment analysis integration
- [ ] Automatic medication extraction
- [ ] Integration with calendar for appointment scheduling
- [ ] SMS notifications post-call

## Testing

### Test with Retell AI Test Numbers

```bash
# Test call (won't actually dial)
curl -X POST http://localhost:3000/api/retell/call \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-id",
    "phoneNumber": "+15005550006"  # Twilio test number
  }'
```

### Test Webhook Locally

```bash
# Use ngrok for local testing
ngrok http 3000

# Update Retell webhook to: https://your-ngrok-url.ngrok.io/api/retell/webhook

# Simulate webhook
curl -X POST http://localhost:3000/api/retell/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call_ended",
    "call": {
      "call_id": "test_call_123",
      "transcript": "Doctor: Hello. Patient: Hi doctor, I need help...",
      "to_number": "+14155551234",
      "metadata": {
        "patient_id": "your-patient-uuid",
        "patient_name": "Test Patient",
        "user_id": "your-user-uuid"
      }
    }
  }'
```

## Summary

**What You Get:**
- ✅ Automated phone calls to patients
- ✅ AI-powered medical consultations
- ✅ Automatic transcript storage
- ✅ AI-generated summaries
- ✅ Full embedding support for search
- ✅ Integration with chat agent
- ✅ Comprehensive logging

**Setup Time:** 15 minutes  
**Cost:** ~$0.50 per call  
**Status:** ✅ **READY TO USE**

Just add your Retell AI credentials and configure the webhook!

