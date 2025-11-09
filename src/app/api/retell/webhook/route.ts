/**
 * Retell AI - Webhook Handler
 * POST /api/retell/webhook
 * 
 * Handles call events from Retell AI:
 * - call_started
 * - call_ended (saves transcript to patient vault)
 * - call_analyzed
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Dynamic import of Retell SDK for signature verification
let Retell: any
try {
  Retell = require("retell-sdk").Retell
} catch {
  console.warn("[Retell Webhook] retell-sdk not installed. Signature verification disabled.")
}

/**
 * Save call transcript as a text file in patient's vault
 */
async function saveTranscriptToVault(
  transcript: string,
  patientId: string,
  userId: string,
  patientName: string,
  callId: string,
  startTimestamp: number,
  endTimestamp: number,
  disconnectionReason?: string
): Promise<void> {
  try {
    console.log("[Retell Webhook] Saving transcript to patient vault")
    console.log("[Retell Webhook] Patient ID:", patientId)
    console.log("[Retell Webhook] Transcript length:", transcript.length)

    const supabase = await createClient()

    // Generate AI summary of the call
    console.log("[Retell Webhook] Generating AI summary...")
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are a medical consultation summarizer. A doctor recently had a call with a patient named ${patientName}.

TRANSCRIPT:
${transcript}

Please provide a detailed summary including:
1. Main health concerns discussed
2. Symptoms reported
3. Medical recommendations given
4. Medications prescribed or suggested
5. Follow-up instructions
6. Any urgent issues mentioned

Format this professionally and make it easy to read. Use clear headings and bullet points where appropriate.

If the transcript is too short or the call was ended abruptly, state: "Call ended prematurely - insufficient information for summary. Patient should be contacted for a proper consultation."`,
        },
      ],
      max_tokens: 1500,
    })

    const summary = summaryResponse.choices[0]?.message?.content || "Summary generation failed"
    console.log("[Retell Webhook] Summary generated, length:", summary.length)

    // Use actual call timestamps from Retell
    const callStartDate = new Date(startTimestamp)
    const callEndDate = new Date(endTimestamp)
    const durationSeconds = Math.floor((endTimestamp - startTimestamp) / 1000)
    const durationMinutes = Math.floor(durationSeconds / 60)
    const durationRemainderSeconds = durationSeconds % 60

    const formattedDate = callStartDate.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    })

    const formattedEndReason = disconnectionReason
      ? disconnectionReason.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      : "Unknown"

    const documentContent = `MEDICAL CONSULTATION TRANSCRIPT
Patient: ${patientName}
Date: ${formattedDate}
Call ID: ${callId}
Duration: ${durationMinutes}m ${durationRemainderSeconds}s
End Reason: ${formattedEndReason}

==================================================
SUMMARY
==================================================

${summary}

==================================================
FULL TRANSCRIPT
==================================================

${transcript}

==================================================
END OF TRANSCRIPT
==================================================

This document was automatically generated from a phone consultation.
Call started: ${callStartDate.toLocaleString()}
Call ended: ${callEndDate.toLocaleString()}

For questions or concerns, please contact your healthcare provider.
`

    // Convert to blob/buffer for storage
    const fileContent = new TextEncoder().encode(documentContent)
    const blob = new Blob([fileContent], { type: "text/plain" })

    // Generate filename using actual call date
    const dateForFilename = callStartDate.toISOString().split("T")[0] // YYYY-MM-DD
    const timeForFilename = callStartDate.toTimeString().split(" ")[0].replace(/:/g, "-") // HH-MM-SS
    const fileName = `consultation_${dateForFilename}_${timeForFilename}_${callId.slice(0, 8)}.txt`
    const storagePath = `${userId}/${patientId}/${fileName}`

    console.log("[Retell Webhook] Uploading file to storage:", storagePath)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("files")
      .upload(storagePath, blob, {
        contentType: "text/plain",
        upsert: false,
      })

    if (uploadError) {
      console.error("[Retell Webhook] Storage upload error:", uploadError)
      throw new Error(`Failed to upload transcript: ${uploadError.message}`)
    }

    console.log("[Retell Webhook] File uploaded successfully:", uploadData.path)

    // Create database record
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        user_id: userId,
        patient_id: patientId,
        folder_id: null, // Root folder
        name: fileName,
        type: "document",
        mime_type: "text/plain",
        size_bytes: fileContent.length,
        storage_path: storagePath,
        description: `Medical consultation call transcript from ${formattedDate}`,
        embedding_status: "pending",
      } as any)
      .select()
      .single()

    if (dbError) {
      console.error("[Retell Webhook] Database insert error:", dbError)
      throw new Error(`Failed to create file record: ${dbError.message}`)
    }

    console.log("[Retell Webhook] File record created:", fileRecord.id)

    // Trigger embedding generation in background
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/embeddings/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: fileRecord.id }),
    }).catch((err) => {
      console.error("[Retell Webhook] Failed to trigger embedding generation:", err)
    })

    console.log("[Retell Webhook] Transcript saved successfully!")
  } catch (error: any) {
    console.error("[Retell Webhook] Error saving transcript:", error)
    throw error
  }
}

/**
 * Webhook handler for Retell AI events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)
    
    console.log("\n" + "=".repeat(60))
    console.log("🔔 RETELL WEBHOOK RECEIVED")
    console.log("=".repeat(60))
    console.log("Event type:", body.event)
    console.log("Call ID:", body.call?.call_id)
    console.log("Timestamp:", new Date().toISOString())

    // Verify webhook signature if SDK is available
    if (Retell && process.env.RETELL_API_KEY) {
      const signature = request.headers.get("x-retell-signature")
      
      if (signature) {
        try {
          const isValid = Retell.verify(
            bodyText,
            process.env.RETELL_API_KEY,
            signature
          )
          
          if (!isValid) {
            console.error("[Retell Webhook] ❌ Invalid signature")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
          }
          
          console.log("[Retell Webhook] ✅ Signature verified")
        } catch (error) {
          console.error("[Retell Webhook] Signature verification error:", error)
          // Continue anyway if verification fails (for development)
        }
      } else {
        console.warn("[Retell Webhook] No signature provided")
      }
    }

    const { event, call } = body

    switch (event) {
      case "call_started":
        console.log("[Retell Webhook] ✅ Call started:", call.call_id)
        console.log("[Retell Webhook] From:", call.from_number, "To:", call.to_number)
        console.log("[Retell Webhook] Direction:", call.direction)
        break

      case "call_ended":
        console.log("[Retell Webhook] ✅ Call ended:", call.call_id)
        console.log("[Retell Webhook] Disconnection reason:", call.disconnection_reason)
        console.log("[Retell Webhook] Transcript length:", call.transcript?.length || 0)
        console.log("[Retell Webhook] Start:", new Date(call.start_timestamp).toLocaleString())
        console.log("[Retell Webhook] End:", new Date(call.end_timestamp).toLocaleString())

        // Extract patient info from metadata
        const metadata = call.metadata || {}
        const patientId = metadata.patient_id
        const userId = metadata.user_id
        const patientName = metadata.patient_name || "Unknown Patient"

        if (!patientId || !userId) {
          console.error("[Retell Webhook] Missing patient or user ID in metadata")
          console.error("[Retell Webhook] Metadata received:", metadata)
          break
        }

        if (!call.transcript || call.transcript.length < 50) {
          console.warn("[Retell Webhook] Transcript too short or missing (length: " + (call.transcript?.length || 0) + "), skipping save")
          break
        }

        // Save transcript to patient vault
        try {
          await saveTranscriptToVault(
            call.transcript,
            patientId,
            userId,
            patientName,
            call.call_id,
            call.start_timestamp,
            call.end_timestamp,
            call.disconnection_reason
          )
          console.log("[Retell Webhook] ✅ Transcript saved successfully")
        } catch (error) {
          console.error("[Retell Webhook] ❌ Failed to save transcript:", error)
          // Don't fail the webhook, just log the error
        }
        break

      case "call_analyzed":
        console.log("[Retell Webhook] ✅ Call analyzed:", call.call_id)
        if (call.call_analysis) {
          console.log("[Retell Webhook] Analysis:", {
            call_successful: call.call_analysis.call_successful,
            call_duration_ms: call.call_analysis.call_duration_ms,
            user_sentiment: call.call_analysis.user_sentiment,
          })
        }
        break

      default:
        console.log("[Retell Webhook] ⚠️ Unknown event type:", event)
    }

    // Acknowledge receipt (Retell expects 2xx response)
    console.log("=".repeat(60))
    console.log("✅ Webhook processed successfully")
    console.log("=".repeat(60) + "\n")
    return NextResponse.json({ success: true, received: true }, { status: 200 })
  } catch (error: any) {
    console.error("\n" + "=".repeat(60))
    console.error("❌ RETELL WEBHOOK ERROR")
    console.error("=".repeat(60))
    console.error("Error:", error)
    console.error("Stack:", error.stack)
    console.error("=".repeat(60) + "\n")
    // Return 200 to prevent Retell from retrying (log the error for debugging)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    )
  }
}

/**
 * GET endpoint for testing webhook connectivity
 */
export async function GET() {
  return NextResponse.json({
    message: "Retell webhook endpoint is active",
    timestamp: new Date().toISOString(),
    endpoint: "/api/retell/webhook",
  })
}

// Disable body size limit for transcripts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}

