import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  generateTextFileEmbeddings, 
  generateWebsiteEmbeddings,
  generatePDFEmbeddings,
  generateImageEmbeddings,
  generateAudioEmbeddings,
  generateVideoEmbeddings
} from "@/lib/services/file-embeddings"

/**
 * API route to generate embeddings for a file or website
 * POST /api/embeddings/generate
 * Body: { fileId?: string, websiteId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, websiteId } = body

    if (!fileId && !websiteId) {
      return NextResponse.json(
        { error: "Either fileId or websiteId is required" },
        { status: 400 }
      )
    }

    if (fileId && websiteId) {
      return NextResponse.json(
        { error: "Cannot process both fileId and websiteId simultaneously" },
        { status: 400 }
      )
    }

    let result

    if (fileId) {
      console.log(`[Embeddings] Generating embeddings for file: ${fileId}`)
      
      // Get file to check type
      const { data: file } = await supabase
        .from("files")
        .select("type, mime_type, name")
        .eq("id", fileId)
        .eq("user_id", user.id)
        .single() as any

      if (!file) {
        console.error(`[Embeddings] File not found: ${fileId}`)
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }

      console.log(`[Embeddings] Processing file: ${file.name}, type: ${file.type}, mime: ${file.mime_type}`)

      // Generate embeddings based on file type
      if (file.type === "image") {
        result = await generateImageEmbeddings(fileId, user.id)
      } else if (file.type === "audio") {
        result = await generateAudioEmbeddings(fileId, user.id)
      } else if (file.type === "video") {
        result = await generateVideoEmbeddings(fileId, user.id)
      } else if (file.mime_type === "application/pdf") {
        result = await generatePDFEmbeddings(fileId, user.id)
      } else {
        // Text and code files
        result = await generateTextFileEmbeddings(fileId, user.id)
      }
      
      console.log(`[Embeddings] Successfully generated ${result.chunkCount} chunks for file: ${file.name}`)
    } else if (websiteId) {
      console.log(`[Embeddings] Generating embeddings for website: ${websiteId}`)
      result = await generateWebsiteEmbeddings(websiteId, user.id)
      console.log(`[Embeddings] Successfully generated ${result.chunkCount} chunks for website`)
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("[Embeddings] Error in embeddings generation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate embeddings" },
      { status: 500 }
    )
  }
}

