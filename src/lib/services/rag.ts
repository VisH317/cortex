/**
 * RAG (Retrieval-Augmented Generation) Service
 * Searches patient records using vector embeddings
 */

import { createClient } from "@/lib/supabase/server"
import { generateEmbedding } from "./embeddings"

export interface RAGResult {
  id: string
  file_id: string | null
  website_id: string | null
  content: string
  metadata: {
    file_name?: string
    file_type?: string
    folder_path?: string
    patient_id?: string
    [key: string]: any
  }
  similarity: number
}

/**
 * Search patient records using RAG
 */
export async function searchPatientRecords(
  query: string,
  patientId: string,
  userId: string,
  options: {
    matchThreshold?: number
    matchCount?: number
  } = {}
): Promise<{ results: RAGResult[]; error?: string }> {
  try {
    const supabase = await createClient()

    console.log(`[RAG] Searching patient records for patient: ${patientId}, query: "${query}"`)

    // First, check if there are any embeddings for this patient
    const { count } = await supabase
      .from("embeddings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("patient_id", patientId)

    console.log(`[RAG] Found ${count} total embeddings for this patient`)

    if (count === 0) {
      console.log("[RAG] No embeddings found - files may not have been processed yet")
      return { 
        results: [], 
        error: "No medical records have been indexed yet. Please wait for uploaded files to be processed." 
      }
    }

    // Generate embedding for the query
    console.log("[RAG] Generating query embedding...")
    const { embedding } = await generateEmbedding(query)
    console.log("[RAG] Query embedding generated successfully")

    // Search for similar embeddings in the database
    const matchThreshold = options.matchThreshold || 0.5 // Lowered from 0.7 for better recall
    const matchCount = options.matchCount || 10

    console.log(`[RAG] Calling match_embeddings with threshold: ${matchThreshold}, count: ${matchCount}`)

    const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: embedding,
      query_user_id: userId,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_patient_id: patientId,
    })

    if (error) {
      console.error("[RAG] Error searching embeddings:", error)
      return { results: [], error: error.message }
    }

    console.log(`[RAG] Found ${data?.length || 0} matching records`)

    if (data && data.length > 0) {
      console.log("[RAG] Top match similarity:", data[0].similarity)
    }

    const results: RAGResult[] = (data || []).map((item: any) => ({
      id: item.id,
      file_id: item.file_id,
      website_id: item.website_id,
      content: item.content_chunk,
      metadata: item.metadata || {},
      similarity: item.similarity,
    }))

    return { results }
  } catch (error: any) {
    console.error("[RAG] RAG search error:", error)
    return { results: [], error: error.message }
  }
}

/**
 * Format RAG results for AI agent context
 */
export function formatRAGResultsForAgent(results: RAGResult[]): string {
  if (results.length === 0) {
    return "No relevant records found."
  }

  let formatted = "Found the following relevant records:\n\n"

  results.forEach((result, index) => {
    const fileName = result.metadata.file_name || "Unknown file"
    const fileType = result.metadata.file_type || "Unknown type"
    const similarity = (result.similarity * 100).toFixed(1)

    formatted += `[${index + 1}] ${fileName} (${fileType}) - ${similarity}% match\n`
    formatted += `Content: ${result.content.substring(0, 500)}${result.content.length > 500 ? "..." : ""}\n\n`
  })

  return formatted
}

/**
 * Get file metadata for a specific file ID
 */
export async function getFileMetadata(fileId: string, userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (error) {
    console.error("Error fetching file metadata:", error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Search across all content types (files, websites, etc.) for a patient
 */
export async function searchPatientContent(
  query: string,
  patientId: string,
  userId: string
): Promise<{ results: RAGResult[]; error?: string }> {
  // Use standard RAG search which already filters by patient
  return searchPatientRecords(query, patientId, userId, {
    matchThreshold: 0.6,
    matchCount: 15,
  })
}

