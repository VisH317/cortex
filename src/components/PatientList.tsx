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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-base text-gray-600">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shadow-lg">
          <Plus className="h-5 w-5" />
          Add Patient
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search patients by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-14 shadow-sm"
        />
      </motion.div>

      {/* Patient Grid */}
      {filteredPatients.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <PatientCard 
                patient={patient}
                onUpdate={() => window.location.reload()}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-16"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-orange-500 shadow-lg">
            <Users className="h-10 w-10 text-white" strokeWidth={2} />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-gray-900">
            {searchQuery ? "No patients found" : "No patients yet"}
          </h3>
          <p className="mb-8 max-w-sm text-center text-base text-gray-600">
            {searchQuery
              ? "Try adjusting your search query"
              : "Get started by adding your first patient"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
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

