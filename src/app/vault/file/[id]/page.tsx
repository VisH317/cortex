import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import FileViewer from "@/components/FileViewer"

async function getParentFolderPath(supabase: any, folderId: string | null): Promise<string> {
  if (!folderId) {
    return "/vault"
  }

  try {
    // Build the full path by traversing up the folder hierarchy
    const pathSegments: string[] = []
    let currentFolderId: string | null = folderId

    while (currentFolderId) {
      const { data: folder } = await supabase
        .from("folders")
        .select("slug, parent_id")
        .eq("id", currentFolderId)
        .single()

      if (!folder) break

      pathSegments.unshift(folder.slug)
      currentFolderId = folder.parent_id
    }

    return pathSegments.length > 0 ? `/vault/${pathSegments.join("/")}` : "/vault"
  } catch (err) {
    return "/vault"
  }
}

export default async function FileViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { id } = await params

  // Get file metadata
  const { data: file, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  // If file doesn't exist, redirect to parent folder or vault root
  if (error || !file) {
    // Try to get the folder path if we have a file record with folder_id
    const redirectPath = "/vault"
    redirect(redirectPath)
  }

  // Get signed URL for file
  const { data: urlData } = await supabase.storage
    .from("files")
    .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

  return (
    <FileViewer
      file={file}
      signedUrl={urlData?.signedUrl || null}
    />
  )
}

