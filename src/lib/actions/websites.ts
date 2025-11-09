/**
 * Website Shortcuts Actions
 * Server actions for managing website shortcuts
 */

import { createClient } from "@/lib/supabase/server"

export interface CreateWebsiteParams {
  url: string
  title: string
  description?: string
  folderId?: string | null
  userId: string
  triggerEmbedding?: boolean // Whether to trigger embedding generation (default: true)
}

export interface CreateWebsiteResult {
  success: boolean
  websiteId?: string
  error?: string
}

/**
 * Create a website shortcut programmatically
 * Used by research agent and other automated processes
 */
export async function createWebsiteShortcut(
  params: CreateWebsiteParams
): Promise<CreateWebsiteResult> {
  const {
    url,
    title,
    description,
    folderId = null,
    userId,
    triggerEmbedding = true,
  } = params

  try {
    const supabase = await createClient()

    // Validate URL
    try {
      new URL(url)
    } catch {
      return {
        success: false,
        error: "Invalid URL format",
      }
    }

    // Insert website shortcut (only essential content fields)
    const { data: insertedWebsite, error: dbError } = await supabase
      .from("website_shortcuts")
      .insert({
        user_id: userId,
        folder_id: folderId,
        url,
        title: title.trim(),
        description: description?.trim() || null,
        embedding_status: "pending",
      } as any)
      .select()
      .single()

    if (dbError || !insertedWebsite) {
      console.error("[Website Actions] Error creating website:", dbError)
      return {
        success: false,
        error: dbError?.message || "Failed to create website shortcut",
      }
    }

    console.log(`[Website Actions] Created website shortcut: ${insertedWebsite.id} - ${title}`)

    // Trigger embedding generation in background if requested
    if (triggerEmbedding) {
      // Fire-and-forget: Don't await, let it run in background
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/embeddings/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: insertedWebsite.id }),
      }).catch(err => {
        console.error("[Website Actions] Failed to trigger embedding generation:", err)
      })
      
      console.log(`[Website Actions] Triggered background embedding generation for website ${insertedWebsite.id}`)
    }

    return {
      success: true,
      websiteId: insertedWebsite.id,
    }
  } catch (error: any) {
    console.error("[Website Actions] Error in createWebsiteShortcut:", error)
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    }
  }
}

/**
 * Create multiple website shortcuts in batch
 * Useful for research agent adding multiple sources
 */
export async function createWebsiteShortcutsBatch(
  websites: Omit<CreateWebsiteParams, "userId" | "triggerEmbedding">[],
  userId: string,
  triggerEmbedding: boolean = true
): Promise<{
  success: boolean
  created: string[]
  failed: Array<{ url: string; error: string }>
}> {
  const created: string[] = []
  const failed: Array<{ url: string; error: string }> = []

  console.log(`[Website Actions] Creating ${websites.length} website shortcuts in batch`)

  for (const website of websites) {
    const result = await createWebsiteShortcut({
      ...website,
      userId,
      triggerEmbedding,
    })

    if (result.success && result.websiteId) {
      created.push(result.websiteId)
    } else {
      failed.push({
        url: website.url,
        error: result.error || "Unknown error",
      })
    }
  }

  console.log(
    `[Website Actions] Batch complete: ${created.length} created, ${failed.length} failed`
  )

  return {
    success: created.length > 0,
    created,
    failed,
  }
}

