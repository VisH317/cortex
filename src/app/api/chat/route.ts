import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { chatWithAgent, type ChatMessage } from "@/lib/services/chat-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { message, patientId, sessionId, patientName, researchModeEnabled } = body

    if (!message || !patientId) {
      return NextResponse.json(
        { error: "Message and patientId are required" },
        { status: 400 }
      )
    }

    // Get or create chat session
    let session
    if (sessionId) {
      const { data: existingSession } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .eq("patient_context_id", patientId)
        .single()
      
      session = existingSession
    }

    if (!session) {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          agent_type: "finder",
          patient_context_id: patientId,
          title: message.substring(0, 100),
        })
        .select()
        .single()

      if (sessionError) {
        throw sessionError
      }

      session = newSession
    }

    // Get conversation history
    const { data: previousMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })

    const conversationHistory: ChatMessage[] = (previousMessages || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add current user message
    conversationHistory.push({
      role: "user",
      content: message,
    })

    // Save user message to database
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: message,
    })

    // Get patient information
    const { data: patient } = await supabase
      .from("patients")
      .select("age, gender, blood_type, date_of_birth, allergies, current_medications, medical_history")
      .eq("id", patientId)
      .eq("user_id", user.id)
      .single()

    // Get patient's files
    const { data: files } = await supabase
      .from("files")
      .select("name, type, mime_type, size_bytes, created_at")
      .eq("user_id", user.id)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })

    // Get AI response
    const { response, citations, error } = await chatWithAgent(
      conversationHistory,
      patientId,
      user.id,
      patientName,
      patient || undefined,
      files || undefined,
      researchModeEnabled || false
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Save assistant message to database
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: response,
      citations: citations ? JSON.stringify(citations) : null,
    })

    return NextResponse.json({
      message: response,
      sessionId: session.id,
      citations,
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const patientId = searchParams.get("patientId")

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      )
    }

    // Get all chat sessions for this patient
    const { data: sessions, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("patient_context_id", patientId)
      .order("updated_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error("Get sessions error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

