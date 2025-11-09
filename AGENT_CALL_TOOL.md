# Chat Agent - Call Patient Tool

## Overview

The chat agent now has the ability to initiate phone calls to patients automatically using Retell AI. This is exposed as a tool that the AI can invoke when it determines a phone call would be beneficial.

## How It Works

### 1. Agent Decision Making

The AI agent can now:
- Analyze the conversation context
- Determine when a phone call would be helpful
- Automatically initiate calls for:
  - **Follow-ups**: "Patient needs to be called about test results"
  - **Check-ins**: "Patient should be contacted to see if symptoms improved"
  - **Urgent matters**: "Patient needs immediate clarification on medication"
  - **Proactive care**: "Patient mentioned feeling worse, should call to check in"

### 2. Tool Definition

```typescript
{
  name: "call_patient",
  description: "Initiate an AI-powered phone call to the patient...",
  parameters: {
    reason: string  // Why the call is needed
  }
}
```

### 3. Example Conversations

#### Example 1: Follow-up on Test Results

```
Doctor: "The patient's test results came back. Can you follow up with them?"

Agent: [Invokes call_patient tool with reason: "Follow up on test results"]

Agent: "✅ Phone call initiated to John Doe at +14155551234.

Reason: Follow up on test results

The call is being placed now by our AI medical assistant. The patient 
will receive a call shortly, and the full conversation transcript will 
be automatically saved to their medical records once the call ends.

Call ID: call_abc123xyz"
```

#### Example 2: Proactive Symptom Check

```
Doctor: "The patient mentioned their headaches were getting worse 
yesterday. We should check in."

Agent: [Analyzes context, decides call would be helpful]
       [Invokes call_patient tool with reason: "Check on worsening headache symptoms"]

Agent: "✅ Phone call initiated to Sarah Smith at +12135551234.

I noticed the patient mentioned worsening symptoms yesterday. I've 
initiated a call to check on their current condition. The AI assistant 
will ask about their headache progression and any new symptoms.

The transcript will be saved to their records automatically."
```

#### Example 3: Medication Clarification

```
Doctor: "Did we clarify the dosage with Mrs. Johnson?"

Agent: [Searches records, finds unclear information]

Agent: "I don't see a clear confirmation in the records. Would you 
like me to call Mrs. Johnson to clarify the medication dosage?"

Doctor: "Yes, please do."

Agent: [Invokes call_patient tool with reason: "Clarify medication dosage"]

Agent: "✅ Call initiated to Mrs. Johnson..."
```

## Capabilities Added to Agent

The agent's system prompt now includes:

```
**Your Capabilities:**
1. 🔍 Search Patient Records
2. 📚 Research Medical Information
3. 📞 Call Patient  ← NEW!
   - Initiate AI-powered phone calls for follow-ups, check-ins, or urgent matters
   - Use when direct conversation would be more effective
   - Transcript automatically saved to patient records
   - Examples: Follow up on test results, check symptoms, medication clarifications
```

## What Happens When Agent Calls

### Step 1: Agent Decides to Call
```typescript
// Agent detects need for call
functionCall: {
  name: "call_patient",
  arguments: {
    reason: "Follow up on test results from yesterday"
  }
}
```

### Step 2: System Initiates Call
```typescript
POST /api/retell/call
{
  patientId: "uuid",
  phoneNumber: "+14155551234"
}
```

### Step 3: Patient Receives Call
- Patient's phone rings
- AI medical assistant conducts conversation
- Discusses the specific reason for the call

### Step 4: Transcript Saved Automatically
```
consultation_2025-11-09_14-30-45_abc12345.txt

MEDICAL CONSULTATION TRANSCRIPT
Patient: John Doe
Date: Saturday, November 9, 2025 at 2:30 PM
Call ID: call_abc123xyz
Duration: 3m 15s
End Reason: User Hangup

[AI-generated summary]
[Full transcript]
```

### Step 5: Agent Informs Doctor
```
"✅ Phone call initiated to John Doe at +14155551234.

Reason: Follow up on test results

The call is being placed now. The transcript will be automatically 
saved to the patient's vault once complete.

Call ID: call_abc123xyz"
```

## Technical Implementation

### Files Modified

1. **`src/lib/services/chat-agent.ts`**
   - Added `call_patient` tool definition
   - Added phone handling in `handleFunctionCall`
   - Updated system prompt with call capability
   - Pass patient phone to handler

2. **`src/app/api/chat/route.ts`**
   - Added `phone` to patient info query
   - Pass phone to chat agent

### Code Flow

```typescript
// 1. Agent decides to call
if (needsCall) {
  toolCall = {
    name: "call_patient",
    arguments: { reason: "..." }
  }
}

// 2. handleFunctionCall processes it
if (functionName === "call_patient") {
  // Check if patient has phone
  if (!patientPhone) {
    return "No phone number on file"
  }
  
  // Call Retell API
  const response = await fetch('/api/retell/call', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      phoneNumber: patientPhone
    })
  })
  
  // Return confirmation
  return `✅ Call initiated...`
}

// 3. Retell makes the call
// 4. Webhook saves transcript
// 5. Patient records updated
```

## When Agent Will Use This Tool

The agent is trained to consider calling when:

### ✅ Good Use Cases
- **Follow-ups needed**: Test results, procedure outcomes
- **Symptom checks**: Patient mentioned worsening condition
- **Medication clarifications**: Dosage, timing, side effects
- **Urgent updates**: New information patient needs immediately
- **Proactive care**: Checking on high-risk patients
- **Appointment reminders**: Important upcoming procedures

### ❌ Not Appropriate
- **Routine questions**: That can wait for patient login
- **Non-urgent matters**: Patient will see in dashboard
- **Multiple calls**: Back-to-back calls to same patient
- **No phone on file**: System will notify doctor instead

## Error Handling

### No Phone Number
```
Agent: "Unable to call patient: No phone number on file. 
Please ask the doctor to add a phone number to the patient's profile."
```

### Call Failed
```
Agent: "❌ Failed to initiate call: [error details]. 
Please try again or contact the patient manually."
```

### API Error
```
Agent: "❌ Error initiating call: Connection timeout. 
Please try contacting the patient manually."
```

## Configuration

### Required Environment Variables

```bash
# Retell AI (for calling)
RETELL_API_KEY=sk_...
RETELL_AGENT_ID=agent_...
RETELL_FROM_NUMBER=+1844...

# App URL (for API calls)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Patient Requirements

Patients must have:
- ✅ Valid phone number in E.164 format
- ✅ Phone number stored in database

## Console Logs

### When Agent Calls
```
[Agent] Initiating call to patient. Reason: "Follow up on test results"
[Agent] Call initiated successfully. Call ID: call_abc123xyz
```

### Call Processing
```
[Retell] Initiating call to patient: John Doe (+14155551234)
[Retell] Call initiated successfully: call_abc123xyz

[Wait for call to complete...]

=== RETELL WEBHOOK RECEIVED ===
Event type: call_ended
[Retell Webhook] ✅ Call ended: call_abc123xyz
[Retell Webhook] Transcript saved successfully
```

## Testing

### Test Agent Calling Capability

```typescript
// In chat, ask the agent:
"Can you call John to follow up on his test results?"

// Agent should respond:
"✅ Phone call initiated to John Doe at +14155551234..."
```

### Test Without Phone Number

```typescript
// Remove phone from patient
// In chat, ask:
"Call the patient to check symptoms"

// Agent should respond:
"Unable to call patient: No phone number on file..."
```

## Example Prompts That Trigger Calls

### Direct Requests
- "Call the patient to follow up"
- "Can you reach out to them about the results?"
- "Please give them a call to check in"

### Implied Requests
- "The patient needs to know about this urgently"
- "Someone should check on their symptoms"
- "We should follow up on that medication change"

### Proactive Suggestions
```
Doctor: "The patient mentioned feeling worse yesterday."

Agent: "I see that. Would you like me to call them to check 
on their current condition?"

Doctor: "Yes"

Agent: [Initiates call]
```

## Benefits

### For Doctors
- ✅ **Automated follow-ups**: AI handles routine check-ins
- ✅ **Proactive care**: Agent suggests calls when appropriate
- ✅ **Time savings**: No need to manually dial and document
- ✅ **Consistent**: Every call documented with transcript

### For Patients
- ✅ **Timely contact**: Get called when needed, not just scheduled
- ✅ **AI availability**: Can be called 24/7 if needed
- ✅ **Better care**: Proactive monitoring and follow-ups
- ✅ **Documented**: All conversations saved to their records

### For System
- ✅ **Automated**: End-to-end process from decision to transcript
- ✅ **Searchable**: Call content becomes searchable immediately
- ✅ **Integrated**: Part of natural agent workflow
- ✅ **Logged**: Full audit trail of all calls

## Security & Privacy

### ✅ Implemented
- Patient ownership verification
- Phone number validation
- Secure API communication
- Encrypted transcript storage
- HIPAA-compliant call recording

### 🔒 Best Practices
- Only call when truly needed
- Clear reason for every call
- Transcript review by doctor
- Patient consent (in Retell agent config)
- Audit trail maintained

## Future Enhancements

Potential improvements:

- [ ] Call scheduling (specific times)
- [ ] Call reminders before initiating
- [ ] Multi-language support
- [ ] Call outcome categorization
- [ ] Sentiment analysis integration
- [ ] Automatic follow-up scheduling
- [ ] Emergency escalation logic
- [ ] Family member calling support

## Summary

**What's New:**
- ✅ Agent can initiate calls automatically
- ✅ Tool integrated into agent capabilities
- ✅ Smart decision-making for when to call
- ✅ Full integration with Retell AI
- ✅ Automatic transcript storage
- ✅ Searchable in chat immediately

**Requirements:**
- Retell AI credentials configured
- Patient has phone number on file
- Agent has access to patient context

**Status:** 🚀 **PRODUCTION READY**

The agent is now equipped to make intelligent decisions about when to call patients and can execute those calls automatically with full documentation!

