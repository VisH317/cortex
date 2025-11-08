import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getFolderBySlugPath, getFolderContents } from "@/lib/actions/folders"
import { parseSlugPath } from "@/lib/utils/slugify"
import VaultContent from "@/components/VaultContent"

export default async function VaultFolderPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { slug } = await params
  const slugPath = slug || []

  // Get the current folder
  const { data: currentFolder, error: folderError } = await getFolderBySlugPath(slugPath)

  if (folderError && slugPath.length > 0) {
    // Folder not found, redirect to home
    redirect("/vault/home")
  }

  // Get folder contents
  const { folders, files, shortcuts } = await getFolderContents(
    currentFolder?.id || null
  )

  return (
    <VaultContent
      currentFolder={currentFolder}
      folders={folders}
      files={files}
      shortcuts={shortcuts}
      slugPath={slugPath}
    />
  )
}

