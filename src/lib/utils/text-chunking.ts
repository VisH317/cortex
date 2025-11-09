/**
 * Text chunking utilities for embedding generation
 * Splits text into manageable chunks while preserving semantic meaning
 */

export interface TextChunk {
  content: string
  index: number
  metadata?: {
    startLine?: number
    endLine?: number
    type?: string
  }
}

/**
 * Chunk text by token count (approximate)
 * Uses character count as a rough proxy for tokens (1 token ≈ 4 characters)
 */
export function chunkByTokens(
  text: string,
  maxTokens: number = 500,
  overlap: number = 50
): TextChunk[] {
  const maxChars = maxTokens * 4
  const overlapChars = overlap * 4
  const chunks: TextChunk[] = []
  
  // Split by paragraphs first to maintain semantic boundaries
  const paragraphs = text.split(/\n\n+/)
  
  let currentChunk = ""
  let chunkIndex = 0
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max length, save current chunk
    if (currentChunk.length + paragraph.length > maxChars && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
      })
      
      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(/\s+/)
      const overlapWords = words.slice(-Math.floor(overlap / 2))
      currentChunk = overlapWords.join(" ") + "\n\n"
    }
    
    // If a single paragraph is too long, split it by sentences
    if (paragraph.length > maxChars) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChars && currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
          })
          currentChunk = ""
        }
        currentChunk += sentence + " "
      }
    } else {
      currentChunk += paragraph + "\n\n"
    }
  }
  
  // Add final chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex++,
    })
  }
  
  return chunks
}

/**
 * Chunk code by logical blocks (functions, classes, etc.)
 * Falls back to line-based chunking if no clear structure
 */
export function chunkCode(
  code: string,
  language: string,
  maxTokens: number = 500
): TextChunk[] {
  const maxChars = maxTokens * 4
  const lines = code.split("\n")
  const chunks: TextChunk[] = []
  
  let currentChunk: string[] = []
  let currentStartLine = 0
  let chunkIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    currentChunk.push(line)
    
    const currentSize = currentChunk.join("\n").length
    
    // Check if we've reached the max size
    if (currentSize > maxChars) {
      // Try to find a good breaking point (empty line, closing brace, etc.)
      let breakPoint = currentChunk.length - 1
      
      // Look backwards for a good break point
      for (let j = currentChunk.length - 1; j >= Math.max(0, currentChunk.length - 10); j--) {
        const l = currentChunk[j].trim()
        if (l === "" || l === "}" || l === "]" || l === ")" || l.endsWith(";")) {
          breakPoint = j + 1
          break
        }
      }
      
      // Save chunk up to break point
      const chunkContent = currentChunk.slice(0, breakPoint).join("\n")
      if (chunkContent.trim().length > 0) {
        chunks.push({
          content: chunkContent,
          index: chunkIndex++,
          metadata: {
            startLine: currentStartLine + 1,
            endLine: currentStartLine + breakPoint,
            type: language,
          },
        })
      }
      
      // Start new chunk with remaining lines
      currentChunk = currentChunk.slice(breakPoint)
      currentStartLine = i - currentChunk.length + 1
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join("\n")
    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent,
        index: chunkIndex++,
        metadata: {
          startLine: currentStartLine + 1,
          endLine: lines.length,
          type: language,
        },
      })
    }
  }
  
  return chunks
}

/**
 * Chunk markdown content preserving structure (headers, code blocks, etc.)
 */
export function chunkMarkdown(
  markdown: string,
  maxTokens: number = 500
): TextChunk[] {
  const maxChars = maxTokens * 4
  const chunks: TextChunk[] = []
  
  // Split by headers first
  const sections = markdown.split(/^(#{1,6}\s+.+)$/gm)
  
  let currentChunk = ""
  let chunkIndex = 0
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    if (!section) continue
    
    // If adding this section exceeds max, save current chunk
    if (currentChunk.length + section.length > maxChars && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        metadata: { type: "markdown" },
      })
      currentChunk = ""
    }
    
    currentChunk += section + "\n"
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex++,
      metadata: { type: "markdown" },
    })
  }
  
  // If we ended up with no chunks (no headers), fall back to regular chunking
  if (chunks.length === 0) {
    return chunkByTokens(markdown, maxTokens)
  }
  
  return chunks
}

/**
 * Extract text content from HTML with improved semantic understanding
 */
export function extractTextFromHTML(html: string): string {
  // Remove script, style, noscript, and SVG tags (including their content)
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
  
  // Remove common non-content elements (nav, header, footer, ads)
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
  text = text.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "")
  // Remove elements with common ad/navigation class names
  text = text.replace(/<div[^>]*class="[^"]*(?:nav|menu|sidebar|ad|advertisement|cookie|popup)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
  
  // Extract alt text from images (add as separate text)
  const altTextMatches = text.matchAll(/<img[^>]+alt="([^"]+)"/gi)
  const altTexts: string[] = []
  for (const match of altTextMatches) {
    if (match[1]) {
      altTexts.push(match[1])
    }
  }
  
  // Extract meta descriptions and Open Graph content
  const metaTexts: string[] = []
  const metaDescMatch = text.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
  if (metaDescMatch?.[1]) {
    metaTexts.push(metaDescMatch[1])
  }
  const ogDescMatch = text.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
  if (ogDescMatch?.[1] && ogDescMatch[1] !== metaDescMatch?.[1]) {
    metaTexts.push(ogDescMatch[1])
  }
  
  // Add line breaks for block elements to preserve structure
  text = text.replace(/<\/p>/gi, "\n\n")
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/div>/gi, "\n")
  text = text.replace(/<\/h[1-6]>/gi, "\n\n")
  text = text.replace(/<\/li>/gi, "\n")
  text = text.replace(/<\/tr>/gi, "\n")
  text = text.replace(/<\/td>/gi, " | ")
  text = text.replace(/<\/th>/gi, " | ")
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ")
  
  // Comprehensive HTML entity decoding
  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&apos;/g, "'")
  text = text.replace(/&mdash;/g, "—")
  text = text.replace(/&ndash;/g, "–")
  text = text.replace(/&hellip;/g, "...")
  text = text.replace(/&ldquo;/g, '"')
  text = text.replace(/&rdquo;/g, '"')
  text = text.replace(/&lsquo;/g, "'")
  text = text.replace(/&rsquo;/g, "'")
  text = text.replace(/&copy;/g, "©")
  text = text.replace(/&reg;/g, "®")
  text = text.replace(/&trade;/g, "™")
  // Numeric entities
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
  text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  // Clean up whitespace but preserve paragraph breaks
  text = text.replace(/[ \t]+/g, " ") // Multiple spaces/tabs to single space
  text = text.replace(/\n\s+\n/g, "\n\n") // Clean up whitespace around line breaks
  text = text.replace(/\n{3,}/g, "\n\n") // Max 2 consecutive line breaks
  text = text.trim()
  
  // Prepend meta descriptions and alt texts if we found them
  const additionalContent = [...metaTexts, ...altTexts]
  if (additionalContent.length > 0) {
    text = additionalContent.join("\n") + "\n\n" + text
  }
  
  return text
}

/**
 * Smart chunking that detects content type and uses appropriate strategy
 */
export function smartChunk(
  content: string,
  contentType: "text" | "code" | "markdown" | "html",
  language?: string,
  maxTokens: number = 500
): TextChunk[] {
  switch (contentType) {
    case "code":
      return chunkCode(content, language || "plaintext", maxTokens)
    case "markdown":
      return chunkMarkdown(content, maxTokens)
    case "html":
      const text = extractTextFromHTML(content)
      return chunkByTokens(text, maxTokens)
    case "text":
    default:
      return chunkByTokens(content, maxTokens)
  }
}

