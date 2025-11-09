"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle } from "lucide-react"
import { Button } from "./ui/button"
import { deletePatient } from "@/lib/actions/patients"
import type { Patient } from "@/types/database.types"

interface DeletePatientModalProps {
  patient: Patient
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function DeletePatientModal({ patient, isOpen, onClose, onSuccess }: DeletePatientModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState("")

  const handleDelete = async () => {
    if (confirmText !== patient.name) {
      setError("Name doesn't match. Please type the patient's name exactly.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await deletePatient(patient.id)

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
      } else {
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setError("Failed to delete patient")
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-red-900/10 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl border-2 border-red-300 bg-white p-8 shadow-2xl"
            >
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 shadow-lg">
                    <AlertTriangle className="h-7 w-7 text-red-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Delete Patient</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-2xl p-2 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="mb-6">
                <p className="mb-4 text-base text-gray-700">
                  Are you sure you want to delete <strong>{patient.name}</strong>? This action cannot be undone.
                </p>
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
                  <p className="mb-3 text-sm font-bold text-red-900">
                    This will permanently delete:
                  </p>
                  <ul className="list-inside list-disc space-y-2 text-sm text-red-800">
                    <li>All patient information</li>
                    <li>All medical records and files</li>
                    <li>All folders and organization</li>
                    <li>All chat conversations</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                  {error}
                </div>
              )}

              {/* Confirmation Input */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Type <span className="font-bold text-red-600">{patient.name}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Enter patient name"
                  className="h-11 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 text-sm text-gray-900 transition-all focus:border-red-400 focus:outline-none focus:ring-4 focus:ring-red-100"
                  disabled={isLoading}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
                  disabled={isLoading || confirmText !== patient.name}
                >
                  {isLoading ? "Deleting..." : "Delete Patient"}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
