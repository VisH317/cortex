"use server"

import { createClient } from "@/lib/supabase/server"
import { generateUniqueSlug } from "@/lib/utils/slugify"
import { revalidatePath } from "next/cache"

export async function createFolder(name: string, parentId: string | null = null, patientId: string | null = null) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  try {
    // Get existing folder slugs at this level to ensure uniqueness
    let query = supabase
      .from("folders")
      .select("slug")
      .eq("user_id", user.id)
      .eq("parent_id", parentId)
    
    if (patientId) {
      query = query.eq("patient_id", patientId)
    } else {
      query = query.is("patient_id", null)
    }

    const { data: existingFolders } = await query

    const existingSlugs = existingFolders?.map(f => f.slug) || []
    const slug = generateUniqueSlug(name, existingSlugs)

    // Create the folder
    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: user.id,
        name,
        slug,
        parent_id: parentId,
        patient_id: patientId,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/")
    revalidatePath(`/patient/${patientId}`)
    return { data, error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function renameFolder(folderId: string, newName: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  try {
    // Get the folder
    const { data: folder, error: fetchError } = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", folderId)
      .eq("user_id", user.id)
      .single()

    if (fetchError) throw fetchError

    // Get existing slugs at same level
    const { data: existingFolders } = await supabase
      .from("folders")
      .select("slug")
      .eq("user_id", user.id)
      .eq("parent_id", folder.parent_id)
      .neq("id", folderId)

    const existingSlugs = existingFolders?.map(f => f.slug) || []
    const newSlug = generateUniqueSlug(newName, existingSlugs)

    // Update folder
    const { data, error } = await supabase
      .from("folders")
      .update({ name: newName, slug: newSlug })
      .eq("id", folderId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/vault")
    return { data, error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  try {
    // Recursively delete subfolders and files
    await deleteFolderRecursive(supabase, user.id, folderId)

    revalidatePath("/vault")
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

async function deleteFolderRecursive(supabase: any, userId: string, folderId: string) {
  // Get all subfolders
  const { data: subfolders } = await supabase
    .from("folders")
    .select("id")
    .eq("parent_id", folderId)
    .eq("user_id", userId)

  // Recursively delete subfolders
  if (subfolders) {
    for (const subfolder of subfolders) {
      await deleteFolderRecursive(supabase, userId, subfolder.id)
    }
  }

  // Get all files in this folder
  const { data: files } = await supabase
    .from("files")
    .select("id, storage_path")
    .eq("folder_id", folderId)
    .eq("user_id", userId)

  // Delete files from storage and database
  if (files) {
    for (const file of files) {
      // Delete from storage
      await supabase.storage.from("files").remove([file.storage_path])
      
      // Delete embeddings
      await supabase
        .from("embeddings")
        .delete()
        .eq("file_id", file.id)
    }

    // Delete file records
    await supabase
      .from("files")
      .delete()
      .eq("folder_id", folderId)
      .eq("user_id", userId)
  }

  // Delete website shortcuts
  await supabase
    .from("website_shortcuts")
    .delete()
    .eq("folder_id", folderId)
    .eq("user_id", userId)

  // Finally, delete the folder itself
  await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId)
}

export async function getFolderBySlugPath(slugPath: string[], patientId: string | null = null) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: "Unauthorized" }
  }

  try {
    if (slugPath.length === 0) {
      // Root level - return null folder
      return { data: null, error: null }
    }

    // Navigate through the path to find the target folder
    let currentParentId: string | null = null
    let currentFolder = null

    for (const slug of slugPath) {
      let query = supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .eq("slug", slug)

      if (currentParentId) {
        query = query.eq("parent_id", currentParentId)
      } else {
        query = query.is("parent_id", null)
      }

      if (patientId) {
        query = query.eq("patient_id", patientId)
      } else {
        query = query.is("patient_id", null)
      }

      const { data: folder, error } = await query.single()

      if (error || !folder) {
        return { data: null, error: "Folder not found" }
      }

      currentFolder = folder
      currentParentId = folder.id
    }

    return { data: currentFolder, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function getFolderContents(folderId: string | null, patientId: string | null = null) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { folders: [], files: [], shortcuts: [], error: "Unauthorized" }
  }

  try {
    // Get subfolders
    let foldersQuery = supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)

    if (folderId) {
      foldersQuery = foldersQuery.eq("parent_id", folderId)
    } else {
      foldersQuery = foldersQuery.is("parent_id", null)
    }

    if (patientId) {
      foldersQuery = foldersQuery.eq("patient_id", patientId)
    } else {
      foldersQuery = foldersQuery.is("patient_id", null)
    }

    const { data: folders, error: foldersError } = await foldersQuery.order("name", { ascending: true })
    if (foldersError) throw foldersError

    // Get files
    let filesQuery = supabase
      .from("files")
      .select("*")
      .eq("user_id", user.id)

    if (folderId) {
      filesQuery = filesQuery.eq("folder_id", folderId)
    } else {
      filesQuery = filesQuery.is("folder_id", null)
    }

    if (patientId) {
      filesQuery = filesQuery.eq("patient_id", patientId)
    } else {
      filesQuery = filesQuery.is("patient_id", null)
    }

    const { data: files, error: filesError } = await filesQuery.order("created_at", { ascending: false })
    if (filesError) throw filesError

    // Get website shortcuts (no patient_id needed for shortcuts for now)
    let shortcutsQuery = supabase
      .from("website_shortcuts")
      .select("*")
      .eq("user_id", user.id)

    if (folderId) {
      shortcutsQuery = shortcutsQuery.eq("folder_id", folderId)
    } else {
      shortcutsQuery = shortcutsQuery.is("folder_id", null)
    }

    const { data: shortcuts, error: shortcutsError } = await shortcutsQuery.order("created_at", { ascending: false })
    if (shortcutsError) throw shortcutsError

    return {
      folders: folders || [],
      files: files || [],
      shortcuts: shortcuts || [],
      error: null
    }
  } catch (error: any) {
    return { folders: [], files: [], shortcuts: [], error: error.message }
  }
}

export async function getAllFolders(patientId: string | null = null) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: [], error: "Unauthorized" }
  }

  try {
    let query = supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)

    if (patientId) {
      query = query.eq("patient_id", patientId)
    } else {
      query = query.is("patient_id", null)
    }

    const { data, error } = await query.order("name", { ascending: true })

    if (error) throw error

    return { data: data || [], error: null }
  } catch (error: any) {
    return { data: [], error: error.message }
  }
}

