/**
 * File embeddings service
 * Handles embedding generation for different file types
 */
// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { generateEmbedding, generateEmbeddingsBatch } from "./embeddings"
import { smartChunk, extractTextFromHTML } from "@/lib/utils/text-chunking"
import { getLanguageFromExtension, isCodeFile } from "@/lib/utils/file-utils"
import { advancedWebScraper, isPlaywrightAvailable } from "@/lib/utils/advanced-web-scraper"
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
 * Detect if a website appears to be a JavaScript-heavy SPA
 */
function detectSPA(html: string, url: string): boolean {
  // Check for common SPA frameworks
  const spaIndicators = [
    /<div id="root">/i,
    /<div id="app">/i,
    /__NEXT_DATA__/,
    /react/i,
    /vue\.js/i,
    /angular/i,
    /_app-/,
    /webpack/i,
  ]
  
  // Check if HTML is minimal (typical of SPA shells)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyContent = bodyMatch?.[1] || ""
  const bodyTextLength = bodyContent.replace(/<[^>]+>/g, "").trim().length
  
  // If body has very little text content, it's likely an SPA
  if (bodyTextLength < 200) {
    return true
  }
  
  // Check for SPA indicators
  return spaIndicators.some(indicator => {
    if (typeof indicator === 'string') {
      return html.includes(indicator)
    }
    return indicator.test(html)
  })
}

/**
 * Fetch website content with smart fallback for JavaScript-rendered sites
 * 
 * This function will use the advanced scraper if available, which includes:
 * - Puppeteer support for JavaScript rendering (if enabled)
 * - Better content extraction
 * - Metadata extraction
 * - Automatic fallback strategies
 */
async function fetchWebsiteContent(url: string): Promise<{ html: string; metadata?: any }> {
  console.log(`[Website Fetch] Fetching: ${url}`)
  
  // Check if advanced scraper should be used
  const useAdvancedScraper = process.env.USE_ADVANCED_SCRAPER !== 'false' // Default to true
  
  if (useAdvancedScraper) {
    try {
      // Always force Playwright for website embeddings to ensure full content capture
      const forcePlaywright = process.env.ENABLE_PLAYWRIGHT === 'true'
      const scrapedContent = await advancedWebScraper(url, { 
        retries: 2,
        forcePlaywright: forcePlaywright
      })
      
      if (scrapedContent.isPuppeteerUsed) {
        console.log(`[Website Fetch] Successfully scraped with Playwright (JavaScript rendered)`)
      } else {
        console.log(`[Website Fetch] Successfully scraped with standard fetch`)
      }
      
      return {
        html: scrapedContent.html,
        metadata: {
          title: scrapedContent.title,
          description: scrapedContent.description,
          author: scrapedContent.author,
          publishedDate: scrapedContent.publishedDate,
          isPuppeteerUsed: scrapedContent.isPuppeteerUsed,
        },
      }
    } catch (error: any) {
      console.warn(`[Website Fetch] Advanced scraper failed: ${error.message}. Falling back to basic fetch.`)
      // Fall through to basic fetch
    }
  }
  
  // Fallback: Basic fetch (fast, works for static sites)
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Check if this is a JavaScript-heavy SPA that needs rendering
    const isSPA = detectSPA(html, url)
    
    if (isSPA && isPlaywrightAvailable()) {
      console.log(`[Website Fetch] SPA detected. Consider enabling ENABLE_PLAYWRIGHT for better results.`)
    } else if (isSPA) {
      console.log(`[Website Fetch] SPA detected, content may be incomplete. Install Playwright for JavaScript rendering:`)
      console.log(`[Website Fetch]   npm install playwright`)
      console.log(`[Website Fetch]   npx playwright install chromium`)
      console.log(`[Website Fetch]   Set ENABLE_PLAYWRIGHT=true in .env`)
    }
    
    return { html, metadata: undefined }
  } catch (error: any) {
    console.error(`[Website Fetch] Error fetching ${url}:`, error.message)
    throw new Error(`Failed to fetch website: ${error.message}`)
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
    // Fetch website content with smart detection
    const { html, metadata: scrapedMetadata } = await fetchWebsiteContent(website.url)
    
    // Extract text content using improved extraction
    const content = extractTextFromHTML(html)

    if (!content || content.length < 50) {
      throw new Error("Insufficient content extracted from website. The site may require JavaScript rendering or may be blocking scrapers.")
    }

    console.log(`[Website Embeddings] Extracted ${content.length} characters from ${website.url}`)
    
    // Update website description if we got additional info from scraping
    if (scrapedMetadata && scrapedMetadata.description && !website.description) {
      await supabase
        .from("website_shortcuts")
        .update({ description: scrapedMetadata.description } as any)
        .eq("id", websiteId)
      console.log(`[Website Embeddings] Updated description from scraped metadata`)
    }

    // Get folder path for metadata
    const folderPath = await getFolderPath(supabase, website.folder_id)

    // Chunk the content (250 tokens = ~1000 chars, under Vertex AI's 1024 limit)
    const chunks = smartChunk(content, "text", undefined, 250)

    if (chunks.length === 0) {
      throw new Error("No content to embed")
    }

    console.log(`[Website Embeddings] Created ${chunks.length} chunks`)

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

    console.log(`[Website Embeddings] Successfully embedded ${chunks.length} chunks (${totalTokens} tokens)`)

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

