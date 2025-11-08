import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Check embedding status for a patient
 * GET /api/embeddings/status?patientId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const patientId = request.nextUrl.searchParams.get("patientId")

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      )
    }

    // Get files for this patient
    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("id, name, type, embedding_status")
      .eq("user_id", user.id)
      .eq("patient_id", patientId)

    if (filesError) {
      throw filesError
    }

    // Get embeddings count for this patient
    const { count: embeddingsCount, error: embeddingsError } = await supabase
      .from("embeddings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("patient_id", patientId)

    if (embeddingsError) {
      throw embeddingsError
    }

    // Get sample embeddings (first 5)
    const { data: sampleEmbeddings, error: sampleError } = await supabase
      .from("embeddings")
      .select("id, content_chunk, metadata, file_id")
      .eq("user_id", user.id)
      .eq("patient_id", patientId)
      .limit(5)

    if (sampleError) {
      throw sampleError
    }

    return NextResponse.json({
      patientId,
      filesCount: files?.length || 0,
      files: files || [],
      embeddingsCount: embeddingsCount || 0,
      sampleEmbeddings: sampleEmbeddings || [],
      status: embeddingsCount && embeddingsCount > 0 ? "ready" : "no_embeddings",
    })
  } catch (error: any) {
    console.error("[Embeddings Status] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check embeddings status" },
      { status: 500 }
    )
  }
}

