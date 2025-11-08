"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { User, Phone, Calendar, Droplet, MoreVertical, Edit2, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Patient } from "@/types/database.types"
import EditPatientModal from "./EditPatientModal"
import DeletePatientModal from "./DeletePatientModal"

interface PatientCardProps {
  patient: Patient
  onUpdate?: () => void
}

export default function PatientCard({ patient, onUpdate }: PatientCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <>
      <Link href={`/patient/${patient.id}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="group relative overflow-hidden rounded-xl border border-black/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
        >
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{patient.name}</h3>
                {patient.age && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {patient.age} years old
                  </p>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setShowMenu(!showMenu)
                }}
                className="rounded-lg p-1 opacity-0 transition-opacity hover:bg-zinc-100 group-hover:opacity-100 dark:hover:bg-zinc-800"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              
              {/* Dropdown Menu */}
              {showMenu && (
                <div 
                  className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-800"
                  onClick={(e) => e.preventDefault()}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setShowMenu(false)
                      setShowEditModal(true)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Patient
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setShowMenu(false)
                      setShowDeleteModal(true)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Patient
                  </button>
                </div>
              )}
            </div>
          </div>

        {/* Info Grid */}
        <div className="space-y-2">
          {patient.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-600 dark:text-zinc-400">{patient.phone}</span>
            </div>
          )}
          {patient.blood_type && (
            <div className="flex items-center gap-2 text-sm">
              <Droplet className="h-4 w-4 text-red-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Blood Type: {patient.blood_type}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-600 dark:text-zinc-400">
              Added {formatDate(patient.created_at)}
            </span>
          </div>
        </div>

        {/* Gender Badge */}
        {patient.gender && (
          <div className="mt-4">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).replace(/_/g, " ")}
            </span>
          </div>
        )}

          {/* Hover Indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
        </motion.div>
      </Link>

      {/* Modals */}
      <EditPatientModal
        patient={patient}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          onUpdate?.()
          window.location.reload()
        }}
      />
      
      <DeletePatientModal
        patient={patient}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={() => {
          onUpdate?.()
          window.location.reload()
        }}
      />
    </>
  )
}

