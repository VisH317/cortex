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
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group relative h-full overflow-hidden rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-md transition-all hover:border-blue-300 hover:shadow-xl"
        >
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
          
          {/* Header */}
          <div className="relative mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <User className="h-7 w-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
                {patient.age && (
                  <p className="text-sm text-gray-600">
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
                className="rounded-xl p-2 opacity-0 transition-all hover:bg-blue-50 group-hover:opacity-100"
              >
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </button>
              
              {/* Dropdown Menu */}
              {showMenu && (
                <div 
                  className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl"
                  onClick={(e) => e.preventDefault()}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setShowMenu(false)
                      setShowEditModal(true)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-blue-50"
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
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Patient
                  </button>
                </div>
              )}
            </div>
          </div>

        {/* Info Grid */}
        <div className="relative space-y-3">
          {patient.phone && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-gray-700 font-medium">{patient.phone}</span>
            </div>
          )}
          {patient.blood_type && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50">
                <Droplet className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-gray-700 font-medium">Blood Type: {patient.blood_type}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50">
              <Calendar className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-gray-600">
              Added {formatDate(patient.created_at)}
            </span>
          </div>
        </div>

        {/* Gender Badge */}
        {patient.gender && (
          <div className="relative mt-5">
            <span className="inline-flex items-center rounded-2xl bg-gradient-to-r from-blue-50 to-orange-50 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200">
              {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).replace(/_/g, " ")}
            </span>
          </div>
        )}

          {/* Hover Indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-3xl bg-gradient-to-r from-blue-500 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />
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

