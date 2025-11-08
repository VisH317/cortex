"use client"

import { useState } from "react"
import { Search, Plus, Users } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import PatientCard from "./PatientCard"
import AddPatientModal from "./AddPatientModal"
import type { Patient } from "@/types/database.types"
import { motion } from "framer-motion"

interface PatientListProps {
  initialPatients: Patient[]
}

export default function PatientList({ initialPatients }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase()
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.phone?.toLowerCase().includes(query) ||
      ""
    )
  })

  const handlePatientAdded = () => {
    // Refresh will happen via revalidatePath in the action
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search patients by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Patient Grid */}
      {filteredPatients.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <PatientCard 
              key={patient.id} 
              patient={patient}
              onUpdate={() => window.location.reload()}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-zinc-50 p-12 dark:border-white/10 dark:bg-zinc-900/50"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            {searchQuery ? "No patients found" : "No patients yet"}
          </h3>
          <p className="mb-6 max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
            {searchQuery
              ? "Try adjusting your search query"
              : "Get started by adding your first patient"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Patient
            </Button>
          )}
        </motion.div>
      )}

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handlePatientAdded}
      />
    </div>
  )
}

