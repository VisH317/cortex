/**
 * File embeddings service
 * Handles embedding generation for different file types
 */

import { createClient } from "@/lib/supabase/server"
import { generateEmbedding, generateEmbeddingsBatch } from "./embeddings"
import { smartChunk, extractTextFromHTML } from "@/lib/utils/text-chunking"
import { getLanguageFromExtension, isCodeFile } from "@/lib/utils/file-utils"
import PDFParser from "pdf2json"
import { promises as fs } from "fs"
import { v4 as uuidv4 } from "uuid"
import { 
  generateImageEmbedding, 
  generateVideoEmbeddings as generateVertexVideoEmbeddings,
  getVideoEmbeddingTier 
} from "./vertex-embeddings"

/**
 * Build folder path string for a file (e.g., "home/projects/research")
 */
async function getFolderPath(supabase: any, folderId: string | null): Promise<string> {
  if (!folderId) return "root"

  const pathSegments: string[] = []
  let currentFolderId: string | null = folderId

  while (currentFolderId) {
    const { data: folder } = await supabase
      .from("folders")
      .select("name, parent_id")
      .eq("id", currentFolderId)
      .single()

    if (!folder) break

    pathSegments.unshift(folder.name)
    currentFolderId = folder.parent_id
  }

  return pathSegments.length > 0 ? pathSegments.join("/") : "root"
}

/**
 * Generate embeddings for text/code files
 */
export async function generateTextFileEmbeddings(
  fileId: string,
  userId: string
): Promise<{ chunkCount: number; totalTokens: number }> {
  const supabase = await createClient()

  // Get file metadata
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  // Update status to processing
  await supabase
    .from("files")
    .update({ embedding_status: "processing" })
    .eq("id", fileId)

  try {
    // Get file content from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from("files")
      .download(file.storage_path)

    if (storageError || !fileData) {
      throw new Error("Failed to download file")
    }

    const content = await fileData.text()

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, file.folder_id)

    // Determine content type and chunk accordingly
    let contentType: "text" | "code" | "markdown" | "html" = "text"
    let language: string | undefined

    if (isCodeFile(file.name)) {
      contentType = "code"
      language = getLanguageFromExtension(file.name)
    } else if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
      contentType = "markdown"
    } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
      contentType = "html"
    }

    // Chunk the content (250 tokens = ~1000 chars, under Vertex AI's 1024 limit)
    const chunks = smartChunk(content, contentType, language, 250)

    if (chunks.length === 0) {
      throw new Error("No content to embed")
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddingsBatch(
      chunks.map((chunk) => chunk.content)
    )

    // Store embeddings in database
    const embeddingsToInsert = chunks.map((chunk, index) => ({
      user_id: userId,
      file_id: fileId,
      patient_id: file.patient_id,
      content_chunk: chunk.content,
      chunk_index: chunk.index,
      embedding: JSON.stringify(embeddings[index].embedding), // Supabase handles vector conversion
      metadata: {
        file_name: file.name,
        file_type: file.type,
        mime_type: file.mime_type,
        folder_path: folderPath,
        folder_id: file.folder_id,
        content_type: contentType,
        language: language,
        ...chunk.metadata,
      },
    }))

    const { error: insertError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert)

    if (insertError) {
      throw insertError
    }

    // Update file status to completed
    await supabase
      .from("files")
      .update({ embedding_status: "completed" })
      .eq("id", fileId)

    const totalTokens = embeddings.reduce((sum, e) => sum + e.tokens, 0)

    return {
      chunkCount: chunks.length,
      totalTokens: Math.round(totalTokens),
    }
  } catch (error: any) {
    console.error("Error generating file embeddings:", error)

    // Update status to failed
    await supabase
      .from("files")
      .update({ embedding_status: "failed" })
      .eq("id", fileId)

    throw error
  }
}

/**
 * Generate embeddings for website shortcuts
 */
export async function generateWebsiteEmbeddings(
  websiteId: string,
  userId: string
): Promise<{ chunkCount: number; totalTokens: number }> {
  const supabase = await createClient()

  // Get website metadata
  const { data: website, error: websiteError } = await supabase
    .from("website_shortcuts")
    .select("*")
    .eq("id", websiteId)
    .eq("user_id", userId)
    .single() as any

  if (websiteError || !website) {
    throw new Error("Website not found")
  }

  // Update status to processing
    await (supabase
      .from("website_shortcuts")
      .update({ embedding_status: "processing" } as any)
      .eq("id", websiteId))

  try {
    // Fetch website content
    const response = await fetch(website.url, {
      headers: {
        "User-Agent": "SynapseVault/1.0 (Research Assistant)",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`)
    }

    const html = await response.text()
    const content = extractTextFromHTML(html)

    if (!content || content.length < 50) {
      throw new Error("Insufficient content extracted from website")
    }

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, website.folder_id)

    // Chunk the content (250 tokens = ~1000 chars, under Vertex AI's 1024 limit)
    const chunks = smartChunk(content, "text", undefined, 250)

    if (chunks.length === 0) {
      throw new Error("No content to embed")
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddingsBatch(
      chunks.map((chunk) => chunk.content)
    )

    // Store embeddings in database
    const embeddingsToInsert = chunks.map((chunk, index) => ({
      user_id: userId,
      website_id: websiteId,
      patient_id: null, // Websites are not patient-specific
      content_chunk: chunk.content,
      chunk_index: chunk.index,
      embedding: JSON.stringify(embeddings[index].embedding),
      metadata: {
        title: website.title,
        url: website.url,
        folder_path: folderPath,
        folder_id: website.folder_id,
        content_type: "website",
        favicon: website.favicon,
        ...chunk.metadata,
      },
    }))

    const { error: insertError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert)

    if (insertError) {
      throw insertError
    }

    // Update website status to completed
    await (supabase
      .from("website_shortcuts")
      .update({ embedding_status: "completed" } as any)
      .eq("id", websiteId))

    const totalTokens = embeddings.reduce((sum, e) => sum + e.tokens, 0)

    return {
      chunkCount: chunks.length,
      totalTokens: Math.round(totalTokens),
    }
  } catch (error: any) {
    console.error("Error generating website embeddings:", error)

    // Update status to failed
    await (supabase
      .from("website_shortcuts")
      .update({ embedding_status: "failed" } as any)
      .eq("id", websiteId))

    throw error
  }
}

/**
 * Generate embeddings for images using Vertex AI multimodal embeddings
 */
export async function generateImageEmbeddings(
  fileId: string,
  userId: string
): Promise<{ chunkCount: number; totalTokens: number }> {
  const supabase = await createClient()

  // Get file metadata
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  // Update status to processing
  await supabase
    .from("files")
    .update({ embedding_status: "processing" })
    .eq("id", fileId)

  try {
    // Get file content from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from("files")
      .download(file.storage_path)

    if (storageError || !fileData) {
      throw new Error("Failed to download file")
    }

    // Convert to base64 for Vertex AI
    const arrayBuffer = await fileData.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString("base64")

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, file.folder_id)

    // Generate embedding using Vertex AI
    const result = await generateImageEmbedding(base64Image, 1408)

    // Store embedding in database
    const embeddingsToInsert = [{
      user_id: userId,
      file_id: fileId,
      patient_id: file.patient_id,
      content_chunk: `Image: ${file.name}`, // Placeholder text for image
      chunk_index: 0,
      embedding: JSON.stringify(result.embedding),
      metadata: {
        file_name: file.name,
        file_type: file.type,
        mime_type: file.mime_type,
        folder_path: folderPath,
        folder_id: file.folder_id,
        content_type: "image",
        embedding_model: "vertex-ai-multimodal",
        dimension: result.dimension,
      },
    }]

    const { error: insertError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert)

    if (insertError) {
      throw insertError
    }

    // Update file status to completed
    await supabase
      .from("files")
      .update({ embedding_status: "completed" })
      .eq("id", fileId)

    // Approximate token usage (Vertex AI doesn't provide token counts)
    // Estimate ~100 tokens per image for billing purposes
    return {
      chunkCount: 1,
      totalTokens: 100,
    }
  } catch (error: any) {
    console.error("Error generating image embeddings:", error)

    // Update status to failed
    await supabase
      .from("files")
      .update({ embedding_status: "failed" })
      .eq("id", fileId)

    throw error
  }
}

/**
 * Generate embeddings for audio files using Vertex AI video embeddings
 * (Vertex AI's video model can process audio content)
 */
export async function generateAudioEmbeddings(
  fileId: string,
  userId: string
): Promise<{ chunkCount: number; totalTokens: number }> {
  const supabase = await createClient()

  // Get file metadata
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  // Update status to processing
  await supabase
    .from("files")
    .update({ embedding_status: "processing" })
    .eq("id", fileId)

  try {
    // For audio, we need to use GCS URI (Vertex AI doesn't support base64 for audio/video)
    // Construct the GCS URI from the storage path
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "files"
    const gcsUri = `gs://${bucketName}/${file.storage_path}`

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, file.folder_id)

    // Generate embeddings for 2-minute segments with 16-second intervals (Essential tier)
    const result = await generateVertexVideoEmbeddings(gcsUri, 0, 120, 16, 1408)

    // Store embeddings in database (one per segment)
    const embeddingsToInsert = result.embeddings.map((embedding, index) => ({
      user_id: userId,
      file_id: fileId,
      patient_id: file.patient_id,
      content_chunk: `Audio: ${file.name} [${result.segments[index].start}s - ${result.segments[index].end}s]`,
      chunk_index: index,
      embedding: JSON.stringify(embedding.embedding),
      metadata: {
        file_name: file.name,
        file_type: file.type,
        mime_type: file.mime_type,
        folder_path: folderPath,
        folder_id: file.folder_id,
        content_type: "audio",
        embedding_model: "vertex-ai-multimodal",
        dimension: embedding.dimension,
        segment_start: result.segments[index].start,
        segment_end: result.segments[index].end,
        interval_sec: 16,
        pricing_tier: getVideoEmbeddingTier(16),
      },
    }))

    const { error: insertError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert)

    if (insertError) {
      throw insertError
    }

    // Update file status to completed
    await supabase
      .from("files")
      .update({ embedding_status: "completed" })
      .eq("id", fileId)

    // Estimate token usage based on audio duration
    const estimatedTokens = result.embeddings.length * 150
    
    return {
      chunkCount: result.embeddings.length,
      totalTokens: estimatedTokens,
    }
  } catch (error: any) {
    console.error("Error generating audio embeddings:", error)

    // Update status to failed
    await supabase
      .from("files")
      .update({ embedding_status: "failed" })
      .eq("id", fileId)

    throw error
  }
}

/**
 * Generate embeddings for video files using Vertex AI multimodal embeddings
 */
export async function generateVideoEmbeddings(
  fileId: string,
  userId: string
): Promise<{ chunkCount: number; totalTokens: number }> {
  const supabase = await createClient()

  // Get file metadata
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  // Update status to processing
  await supabase
    .from("files")
    .update({ embedding_status: "processing" })
    .eq("id", fileId)

  try {
    // For video, we need to use GCS URI
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "files"
    const gcsUri = `gs://${bucketName}/${file.storage_path}`

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, file.folder_id)

    // Generate embeddings with 10-second intervals (Standard tier for better quality)
    // First 2 minutes of video
    const result = await generateVertexVideoEmbeddings(gcsUri, 0, 120, 10, 1408)

    // Store embeddings in database (one per segment)
    const embeddingsToInsert = result.embeddings.map((embedding, index) => ({
      user_id: userId,
      file_id: fileId,
      patient_id: file.patient_id,
      content_chunk: `Video: ${file.name} [${result.segments[index].start}s - ${result.segments[index].end}s]`,
      chunk_index: index,
      embedding: JSON.stringify(embedding.embedding),
      metadata: {
        file_name: file.name,
        file_type: file.type,
        mime_type: file.mime_type,
        folder_path: folderPath,
        folder_id: file.folder_id,
        content_type: "video",
        embedding_model: "vertex-ai-multimodal",
        dimension: embedding.dimension,
        segment_start: result.segments[index].start,
        segment_end: result.segments[index].end,
        interval_sec: 10,
        pricing_tier: getVideoEmbeddingTier(10),
      },
    }))

    const { error: insertError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert)

    if (insertError) {
      throw insertError
    }

    // Update file status to completed
    await supabase
      .from("files")
      .update({ embedding_status: "completed" })
      .eq("id", fileId)

    // Estimate token usage based on video segments
    const estimatedTokens = result.embeddings.length * 200
    
    return {
      chunkCount: result.embeddings.length,
      totalTokens: estimatedTokens,
    }
  } catch (error: any) {
    console.error("Error generating video embeddings:", error)

    // Update status to failed
    await supabase
      .from("files")
      .update({ embedding_status: "failed" })
      .eq("id", fileId)

    throw error
  }
}

/**
 * Generate embeddings for PDF files
 * Extracts text from PDF and creates embeddings with page metadata
 */
export async function generatePDFEmbeddings(
  fileId: string,
  userId: string
): Promise<{ chunkCount: number; totalTokens: number }> {
  const supabase = await createClient()

  // Get file metadata
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fileError || !file) {
    throw new Error("File not found")
  }

  // Update status to processing
  await supabase
    .from("files")
    .update({ embedding_status: "processing" })
    .eq("id", fileId)

  try {
    // Get file content from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from("files")
      .download(file.storage_path)

    if (storageError || !fileData) {
      throw new Error("Failed to download file")
    }

    // Convert blob to buffer and write to temp file
    const fileBuffer = Buffer.from(await fileData.arrayBuffer())
    const tempFileName = uuidv4()
    const tempFilePath = `/tmp/${tempFileName}.pdf`
    await fs.writeFile(tempFilePath, fileBuffer)

    // Parse PDF using pdf2json
    const pdfParser = new (PDFParser as any)(null, 1)
    
    let extractedText = ""
    
    await new Promise<void>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error("PDF Parser Error:", errData.parserError)
        reject(new Error(errData.parserError))
      })

      pdfParser.on("pdfParser_dataReady", () => {
        try {
          // Extract text manually from parsed data to avoid getRawTextContent() errors
          const pages = pdfParser.data?.Pages || []
          const textParts: string[] = []
          
          for (const page of pages) {
            const texts = page.Texts || []
            for (const text of texts) {
              const decodedTexts = text.R || []
              for (const r of decodedTexts) {
                if (r.T) {
                  try {
                    // Try to decode URI-encoded text
                    const decoded = decodeURIComponent(r.T)
                    textParts.push(decoded)
                  } catch (decodeError) {
                    // If decoding fails, use the raw text
                    textParts.push(r.T.replace(/%/g, ' '))
                  }
                }
              }
              // Add space between text elements
              textParts.push(' ')
            }
            // Add line break between pages
            textParts.push('\n\n')
          }
          
          extractedText = textParts.join('')
          resolve()
        } catch (error: any) {
          console.error("Error extracting text from PDF:", error)
          reject(new Error(`Failed to extract text: ${error.message}`))
        }
      })

      pdfParser.loadPDF(tempFilePath)
    })

    // Clean up temp file
    try {
      await fs.unlink(tempFilePath)
    } catch (unlinkError) {
      console.warn("Failed to clean up temp file:", unlinkError)
    }

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("Insufficient text content in PDF")
    }

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, file.folder_id)

    // Chunk the extracted text (250 tokens = ~1000 chars, under Vertex AI's 1024 limit)
    const chunks = smartChunk(extractedText, "text", undefined, 250)

    if (chunks.length === 0) {
      throw new Error("No content to embed")
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddingsBatch(
      chunks.map((chunk) => chunk.content)
    )

    // Store embeddings in database with PDF-specific metadata
    const embeddingsToInsert = chunks.map((chunk, index) => ({
      user_id: userId,
      file_id: fileId,
      patient_id: file.patient_id,
      content_chunk: chunk.content,
      chunk_index: chunk.index,
      embedding: JSON.stringify(embeddings[index].embedding),
      metadata: {
        file_name: file.name,
        file_type: file.type,
        mime_type: file.mime_type,
        folder_path: folderPath,
        folder_id: file.folder_id,
        content_type: "pdf",
        ...chunk.metadata,
      },
    }))

    const { error: insertError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert as any)

    if (insertError) {
      throw insertError
    }

    // Update file status to completed
    await (supabase
      .from("files")
      .update({ embedding_status: "completed" } as any)
      .eq("id", fileId))

    const totalTokens = embeddings.reduce((sum, e) => sum + e.tokens, 0)

    return {
      chunkCount: chunks.length,
      totalTokens: Math.round(totalTokens),
    }
  } catch (error: any) {
    console.error("Error generating PDF embeddings:", error)

    // Update status to failed
    await (supabase
      .from("files")
      .update({ embedding_status: "failed" } as any)
      .eq("id", fileId))

    throw error
  }
}

