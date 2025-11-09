# Retell AI - UI Button Integration

## Overview
The Retell AI call functionality is implemented as a button in the patient header, allowing doctors to initiate AI-powered phone calls directly from the patient page.

## Implementation

### 1. UI Button Location
- **File**: `src/components/PatientHeader.tsx`
- **Location**: Next to the phone number display in the patient details grid
- **Visibility**: Only shows when:
  - Patient has a phone number on file
  - Not in edit mode

### 2. Button Features
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={handleCallPatient}
  disabled={isCalling}
  className="h-7 gap-1.5 px-2 text-xs"
  title="Call patient with AI assistant"
>
  <PhoneCall className="h-3 w-3" />
  {isCalling ? "Calling..." : "Call"}
</Button>
```

**Features:**
- Small, compact button next to phone number
- Shows loading state ("Calling...") during API call
- Displays success/error messages below phone number
- Auto-dismisses status messages after 5-10 seconds

### 3. Call Handler Function
```typescript
const handleCallPatient = async () => {
  if (!patient.phone) {
    setCallStatus({ message: "No phone number on file", type: 'error' })
    return
  }

  setIsCalling(true)
  
  try {
    const response = await fetch("/api/retell/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient.id,
        phoneNumber: patient.phone,
      }),
    })

    const result = await response.json()
    
    if (result.success) {
      setCallStatus({ 
        message: `Call initiated successfully! Call ID: ${result.callId}`, 
        type: 'success' 
      })
    } else {
      setCallStatus({ 
        message: `Failed to initiate call: ${result.error}`, 
        type: 'error' 
      })
    }
  } catch (error) {
    setCallStatus({ message: `Error: ${error.message}`, type: 'error' })
  } finally {
    setIsCalling(false)
  }
}
```

## API Integration

### Call API Endpoint
**Endpoint**: `/api/retell/call`

**Request**:
```json
{
  "patientId": "uuid",
  "phoneNumber": "+1234567890"
}
```

**Response** (Success):
```json
{
  "success": true,
  "callId": "call_abc123",
  "message": "Call initiated successfully"
}
```

**Response** (Error):
```json
{
  "error": "Error message"
}
```

## User Experience

### Workflow
1. Doctor opens patient page
2. Sees phone number with "Call" button next to it
3. Clicks "Call" button
4. Button shows "Calling..." state
5. Success message appears: "Call initiated successfully! Call ID: call_abc123"
6. Patient receives call from AI assistant
7. Transcript is automatically saved to patient's vault after call ends

### Status Messages
- **Success**: Green text, displays for 10 seconds
- **Error**: Red text, displays for 5 seconds
- Messages auto-dismiss to avoid clutter

## Design Decisions

### Why UI Button Instead of Agent Tool?

**Original approach**: Call functionality was exposed as an agent tool
**New approach**: UI button in patient header

**Reasons for change**:
1. **More intuitive**: Doctors expect to click a button to call, not ask an AI to do it
2. **Faster**: One click vs typing a message to the agent
3. **More visible**: Button is always visible when phone number exists
4. **Better UX**: Clear visual affordance for calling action
5. **Simpler**: No need to explain to doctors how to ask AI to make calls

## Files Modified

### 1. PatientHeader.tsx
- Added `PhoneCall` icon import
- Added `isCalling` and `callStatus` state
- Added `handleCallPatient` function
- Modified phone display section to include button
- Added status message display

### 2. chat-agent.ts (Reverted)
- Removed `call_patient` tool definition
- Removed `patientPhone` and `patientName` parameters from `handleFunctionCall`
- Removed call handling logic from function handler
- Removed phone reference from `chatWithAgent` parameters

### 3. chat/route.ts (Reverted)
- Removed `phone` from patient data query

## Testing

### Manual Testing Checklist
- [ ] Button appears when patient has phone number
- [ ] Button does NOT appear when patient has no phone number
- [ ] Button disappears in edit mode
- [ ] Clicking button shows "Calling..." state
- [ ] Success message appears after successful call
- [ ] Error message appears on failure
- [ ] Status messages auto-dismiss
- [ ] Multiple clicks are prevented during call
- [ ] Call ID is displayed in success message

### Edge Cases
- ✅ No phone number: Button hidden
- ✅ Invalid phone number: API returns error
- ✅ Network error: Error message displayed
- ✅ Retell API down: Error message displayed
- ✅ Edit mode: Button hidden

## Future Enhancements

### Potential Improvements
1. **Call History**: Show recent calls in patient details
2. **Call Status**: Real-time call status updates
3. **Call Scheduling**: Schedule calls for later
4. **Call Notes**: Add pre-call notes/agenda
5. **Call Summary**: Quick view of transcript summary
6. **Multiple Numbers**: Support emergency contact calling
7. **Confirmation Dialog**: "Are you sure you want to call?" before initiating

### Analytics
Track call metrics:
- Number of calls initiated
- Success rate
- Average call duration
- Transcript quality
- Most common call times

## Related Documentation
- `RETELL_AI_INTEGRATION.md` - Overall Retell integration
- `RETELL_SETUP_COMPLETE.md` - Setup instructions
- `RETELL_QUICK_START.md` - Quick start guide
- `src/app/api/retell/call/route.ts` - Call API implementation
- `src/app/api/retell/webhook/route.ts` - Webhook implementation

