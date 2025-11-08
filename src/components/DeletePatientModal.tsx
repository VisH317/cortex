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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-zinc-900"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Delete Patient</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete <strong>{patient.name}</strong>? This action cannot be undone.
                </p>
                <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
                  <p className="mb-2 text-sm font-semibold text-red-900 dark:text-red-300">
                    This will permanently delete:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-red-800 dark:text-red-400">
                    <li>All patient information</li>
                    <li>All medical records and files</li>
                    <li>All folders and organization</li>
                    <li>All chat conversations</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Confirmation Input */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium">
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
                  className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-zinc-800"
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
                  className="flex-1 bg-red-600 hover:bg-red-700"
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

