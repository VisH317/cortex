import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getPatients } from "@/lib/actions/patients"
import PatientList from "@/components/PatientList"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: patients, error } = await getPatients()

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error loading patients</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-950">
      {/* Header - kept simple since we have layout */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <PatientList initialPatients={patients || []} />
      </div>
    </div>
  )

}
