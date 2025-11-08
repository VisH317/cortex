import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { getPatientById } from "@/lib/actions/patients"
import { getFolderContents } from "@/lib/actions/folders"
import PatientDetailClient from "./PatientDetailClient"

interface PatientDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { id } = await params
  const { data: patient, error } = await getPatientById(id)

  if (error || !patient) {
    notFound()
  }

  // Get root level contents for this patient
  const { folders, files, shortcuts } = await getFolderContents(null, id)

  return (
    <PatientDetailClient
      patient={patient}
      folders={folders}
      files={files}
      shortcuts={shortcuts}
      patientId={id}
    />
  )
}

