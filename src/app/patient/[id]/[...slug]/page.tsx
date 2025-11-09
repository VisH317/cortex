import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getFolderBySlugPath, getFolderContents } from "@/lib/actions/folders"
import PatientDetailClient from "../PatientDetailClient"

export default async function PatientFolderPage({
  params,
}: {
  params: Promise<{ id: string; slug: string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { id: patientId, slug } = await params
  const slugPath = slug || []

  // Get patient information
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .eq("user_id", user.id)
    .single()

  if (!patient) {
    redirect("/")
  }

  // Get the current folder
  const { data: currentFolder, error: folderError } = await getFolderBySlugPath(slugPath, patientId)

  if (folderError && slugPath.length > 0) {
    // Folder not found, redirect to patient root
    redirect(`/patient/${patientId}`)
  }

  // Get folder contents
  const { folders, files, shortcuts } = await getFolderContents(
    (currentFolder as any).id || null,
    patientId
  )

  return (
    <PatientDetailClient
      patient={patient}
      folders={folders}
      files={files}
      shortcuts={shortcuts}
      patientId={patientId}
      currentFolder={currentFolder}
      slugPath={slugPath}
    />
  )
}

