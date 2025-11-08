"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function moveFile(fileId: string, targetFolderId: string | null) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  try {
    const { error } = await supabase
      .from("files")
      .update({ folder_id: targetFolderId })
      .eq("id", fileId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/vault")
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function moveWebsiteShortcut(shortcutId: string, targetFolderId: string | null) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  try {
    const { error } = await supabase
      .from("website_shortcuts")
      .update({ folder_id: targetFolderId })
      .eq("id", shortcutId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/vault")
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

