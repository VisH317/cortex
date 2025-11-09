# Retell API Fix - Endpoint and Phone Number Formatting

## Issue
The Retell API call was failing with:
```
Cannot POST /create-phone-call
```

## Root Causes

### 1. ❌ Wrong API Endpoint
**Before**: `https://api.retellai.com/create-phone-call`
**After**: `https://api.retellai.com/v2/create-phone-call`

The API endpoint was missing the `/v2/` version prefix.

### 2. ❌ Wrong Parameter Name
**Before**: `agent_id`
**After**: `override_agent_id`

According to the Retell API docs, we should use `override_agent_id` for specifying the agent on a per-call basis.

### 3. ❌ Phone Number Format Issues
**Problem**: Phone numbers weren't in E.164 format
- Example: `7326104870` (missing country code)
- Required: `+17326104870` (E.164 format with +1 country code)

## Changes Made

### 1. Fixed API Endpoint
```typescript
// Before
const retellResponse = await fetch("https://api.retellai.com/create-phone-call", {

// After
const retellResponse = await fetch("https://api.retellai.com/v2/create-phone-call", {
```

### 2. Fixed Parameter Name
```typescript
// Before
const callData = {
  agent_id: agentId || process.env.RETELL_AGENT_ID,
}

// After
const callData = {
  override_agent_id: agentId || process.env.RETELL_AGENT_ID,
}
```

### 3. Added E.164 Phone Number Formatter
```typescript
function formatToE164(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, "")
  
  // If already has +, return as is
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  
  // If starts with 1 and has 11 digits, add +
  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return "+" + cleaned
  }
  
  // If 10 digits, assume US number and add +1
  if (cleaned.length === 10) {
    return "+1" + cleaned
  }
  
  // Otherwise return as is with + prefix
  return "+" + cleaned
}
```

**Usage**:
```typescript
const fromNumber = formatToE164(process.env.RETELL_FROM_NUMBER)
const toNumber = formatToE164(phoneNumber)
```

### 4. Enhanced Validation
Added better error messages for missing configuration:
- Missing API key
- Missing from number
- Missing agent ID

## Important: Check Your Environment Variables

### ⚠️ Fix RETELL_FROM_NUMBER
Your logs show:
```
"from_number": "+13159097604."
```

Notice the **trailing period** (`.`) at the end! This will cause issues.

**Fix your `.env` file**:
```bash
# WRONG - has trailing period
RETELL_FROM_NUMBER=+13159097604.

# CORRECT - no trailing period
RETELL_FROM_NUMBER=+13159097604
```

### ✅ Complete Environment Setup
```bash
# Retell AI Configuration
RETELL_API_KEY=your-retell-api-key-here
RETELL_AGENT_ID=agent_7af09b7fecf8f1c53daef9f253
RETELL_FROM_NUMBER=+13159097604
```

**Note**: No quotes, no trailing characters, just the clean values.

## Testing

### Test the Fix
```bash
# Restart your server to pick up env changes
npm run dev

# Click the "Call" button in the patient header
# Or test with curl:
curl -X POST http://localhost:3000/api/retell/call \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid-here",
    "phoneNumber": "7326104870"
  }'
```

### Expected Log Output
```
[Retell] Initiating call to patient: John Doe (7326104870)
[Retell] Formatted numbers - From: +13159097604, To: +17326104870
[Retell] Call data: {
  "from_number": "+13159097604",
  "to_number": "+17326104870",
  "override_agent_id": "agent_7af09b7fecf8f1c53daef9f253",
  "metadata": { ... }
}
[Retell] Call initiated successfully
```

## Phone Number Format Support

The formatter handles various input formats:

| Input | Output |
|-------|--------|
| `7326104870` | `+17326104870` |
| `17326104870` | `+17326104870` |
| `+17326104870` | `+17326104870` |
| `(732) 610-4870` | `+17326104870` |
| `732-610-4870` | `+17326104870` |

All are converted to E.164 format (`+[country code][number]`).

## API Reference

### Retell v2 Create Phone Call Endpoint

**URL**: `POST https://api.retellai.com/v2/create-phone-call`

**Headers**:
```
Authorization: Bearer YOUR_RETELL_API_KEY
Content-Type: application/json
```

**Body**:
```json
{
  "from_number": "+14155551234",
  "to_number": "+12135551234",
  "override_agent_id": "agent_xxx",
  "metadata": {
    "patient_id": "uuid",
    "user_id": "uuid"
  },
  "retell_llm_dynamic_variables": {
    "patient_name": "John Doe"
  }
}
```

**Response** (201 Created):
```json
{
  "call_id": "Jabr9TXYYJHfvl6Syypi88rdAHYHmcq6",
  "call_status": "registered",
  "agent_id": "agent_xxx",
  "from_number": "+14155551234",
  "to_number": "+12135551234"
}
```

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/retell/call/route.ts` | ✅ Fixed endpoint URL<br>✅ Fixed parameter name<br>✅ Added E.164 formatter<br>✅ Enhanced validation |

## Summary

✅ **Fixed**: API endpoint now uses `/v2/create-phone-call`
✅ **Fixed**: Using `override_agent_id` parameter
✅ **Fixed**: Phone numbers auto-formatted to E.164
✅ **Added**: Better error messages and validation
⚠️ **Action Required**: Remove trailing period from `RETELL_FROM_NUMBER` in `.env`

The call button should now work correctly!

