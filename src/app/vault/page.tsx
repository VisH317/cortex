import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getFolderContents } from "@/lib/actions/folders"
import VaultContent from "@/components/VaultContent"

export default async function VaultRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  // Get root level contents
  const { folders, files, shortcuts } = await getFolderContents(null)

  return (
    <VaultContent
      currentFolder={null}
      folders={folders}
      files={files}
      shortcuts={shortcuts}
      slugPath={[]}
    />
  )
}
