/**
 * Retell AI - Initiate Phone Call
 * POST /api/retell/call
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Ensure phone number is in E.164 format
 * E.164 format: +[country code][number]
 * Example: +14155551234
 */
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, phoneNumber, agentId } = body

    // Validate required fields
    if (!patientId || !phoneNumber) {
      return NextResponse.json(
        { error: "patientId and phoneNumber are required" },
        { status: 400 }
      )
    }

    // Verify patient belongs to user and fetch all relevant data
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, name, phone, age, gender, blood_type, date_of_birth, address, emergency_contact, insurance_info")
      .eq("id", patientId)
      .eq("user_id", user.id)
      .single()

    if (patientError || !patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      )
    }

    console.log(`[Retell] Initiating call to patient: ${(patient as any).name} (${phoneNumber})`)

    // Create patient summary for the AI agent
    const summaryParts = [`Patient Name: ${(patient as any).name}`]
    
    if ((patient as any).age) summaryParts.push(`Age: ${(patient as any).age} years old`)
    if ((patient as any).gender) summaryParts.push(`Gender: ${(patient as any).gender.replace(/_/g, ' ')}`)
    if ((patient as any).blood_type) summaryParts.push(`Blood Type: ${(patient as any).blood_type}`)
    if ((patient as any).date_of_birth) {
      const dob = new Date((patient as any).date_of_birth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      summaryParts.push(`Date of Birth: ${dob}`)
    }
    if ((patient as any).phone) summaryParts.push(`Phone: ${(patient as any).phone}`)
    if ((patient as any).address) summaryParts.push(`Address: ${(patient as any).address}`)
    if ((patient as any).emergency_contact) summaryParts.push(`Emergency Contact: ${(patient as any).emergency_contact}`)
    if ((patient as any).insurance_info) summaryParts.push(`Insurance: ${(patient as any).insurance_info}`)
    
    const patientSummary = summaryParts.join('. ') + '.'

    console.log(`[Retell] Patient summary created:`, patientSummary)

    // Check for Retell configuration
    if (!process.env.RETELL_API_KEY) {
      console.error("[Retell] RETELL_API_KEY not configured")
      return NextResponse.json(
        { error: "Retell AI not configured: Missing API key" },
        { status: 500 }
      )
    }

    if (!process.env.RETELL_FROM_NUMBER) {
      console.error("[Retell] RETELL_FROM_NUMBER not configured")
      return NextResponse.json(
        { error: "Retell AI not configured: Missing from number" },
        { status: 500 }
      )
    }

    const configuredAgentId = agentId || process.env.RETELL_AGENT_ID
    if (!configuredAgentId) {
      console.error("[Retell] RETELL_AGENT_ID not configured")
      return NextResponse.json(
        { error: "Retell AI not configured: Missing agent ID" },
        { status: 500 }
      )
    }

    // Format phone numbers to E.164 format
    const fromNumber = formatToE164(process.env.RETELL_FROM_NUMBER)
    const toNumber = formatToE164(phoneNumber)

    console.log(`[Retell] Formatted numbers - From: ${fromNumber}, To: ${toNumber}`)

    // Prepare call data
    const callData = {
      from_number: fromNumber,
      to_number: toNumber,
      override_agent_id: configuredAgentId,
      metadata: {
        patient_id: patientId,
        patient_name: (patient as any).name,
        user_id: user.id,
      },
      // Add custom variables for the agent
      retell_llm_dynamic_variables: {
        patient_name: (patient as any).name,
        patient_summary: patientSummary,
      },
    }

    console.log("[Retell] Call data:", JSON.stringify(callData, null, 2))

    // Make API call to Retell
    const retellResponse = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(callData),
    })

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text()
      console.error("[Retell] API error:", errorText)
      return NextResponse.json(
        { error: "Failed to initiate call", details: errorText },
        { status: retellResponse.status }
      )
    }

    const result = await retellResponse.json()
    console.log("[Retell] Call initiated successfully:", result)

    return NextResponse.json({
      success: true,
      callId: result.call_id,
      status: result.call_status,
      message: `Call initiated to ${(patient as any).name}`,
    })
  } catch (error: any) {
    console.error("[Retell] Error initiating call:", error)
    return NextResponse.json(
      { error: error.message || "Failed to initiate call" },
      { status: 500 }
    )
  }
}

