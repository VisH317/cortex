/**
 * Embeddings service for generating vector embeddings using Vertex AI
 */

import { PredictionServiceClient } from "@google-cloud/aiplatform"

const client = new PredictionServiceClient({
  apiEndpoint: `${process.env.GOOGLE_CLOUD_LOCATION}-aiplatform.googleapis.com`,
})

const project = process.env.GOOGLE_CLOUD_PROJECT_ID!
const location = process.env.GOOGLE_CLOUD_LOCATION!
const model = "multimodalembedding@001"
const dimension = 1408 // Vertex AI max dimension for best quality

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

/**
 * Generate embedding for a single text chunk using Vertex AI
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Vertex AI has a 1024 character limit for text embeddings
    const maxChars = 1024
    let truncatedText = text
    if (text.length > maxChars) {
      console.warn(`Text exceeds ${maxChars} chars (${text.length}), truncating...`)
      truncatedText = text.substring(0, maxChars)
    }

    const endpoint = `projects/${project}/locations/${location}/publishers/google/models/${model}`

    // Build request in the correct protobuf structure
    const instanceValue = {
      structValue: {
        fields: {
          text: {
            stringValue: truncatedText,
          },
        },
      },
    }

    const parametersValue = {
      structValue: {
        fields: {
          dimension: {
            numberValue: dimension,
          },
        },
      },
    }

    const request = {
      endpoint,
      instances: [instanceValue],
      parameters: parametersValue,
    }

    const [response] = await client.predict(request as any)

    if (!response.predictions || response.predictions.length === 0) {
      throw new Error("No predictions returned from Vertex AI")
    }

    const prediction = response.predictions[0] as any
    const textEmbedding = prediction.structValue?.fields?.textEmbedding?.listValue?.values || []
    const embedding = textEmbedding.map((v: any) => v.numberValue)

    if (embedding.length === 0) {
      throw new Error("Empty embedding returned from Vertex AI")
    }

    // Estimate tokens (Vertex AI doesn't return token count)
    const estimatedTokens = Math.ceil(text.length / 4)

    return {
      embedding,
      tokens: estimatedTokens,
    }
  } catch (error: any) {
    console.error("Error generating embedding:", error)
    throw new Error(`Failed to generate embedding: ${error.message}`)
  }
}

/**
 * Generate embeddings for multiple text chunks in batch
 * Vertex AI processes one at a time (no native batch support for text)
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 10 // Reduced batch size for sequential processing
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = []
  
  // Process texts sequentially with small delays to avoid rate limits
  for (let i = 0; i < texts.length; i++) {
    try {
      const result = await generateEmbedding(texts[i])
      results.push(result)
      
      // Add small delay every batch to avoid rate limiting
      if ((i + 1) % batchSize === 0 && i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error: any) {
      console.error(`Error generating embedding for text ${i}:`, error)
      throw new Error(`Failed to generate embeddings: ${error.message}`)
    }
  }

  return results
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

