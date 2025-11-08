"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { updatePatient } from "@/lib/actions/patients"
import type { Patient, Gender, BloodType } from "@/types/database.types"

interface EditPatientModalProps {
  patient: Patient
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function EditPatientModal({ patient, isOpen, onClose, onSuccess }: EditPatientModalProps) {
  const [formData, setFormData] = useState({
    name: patient.name,
    phone: patient.phone || "",
    age: patient.age?.toString() || "",
    gender: (patient.gender || "") as Gender | "",
    blood_type: (patient.blood_type || "") as BloodType | "",
    date_of_birth: patient.date_of_birth || "",
    address: patient.address || "",
    emergency_contact: patient.emergency_contact || "",
    insurance_info: patient.insurance_info || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        name: patient.name,
        phone: patient.phone || "",
        age: patient.age?.toString() || "",
        gender: (patient.gender || "") as Gender | "",
        blood_type: (patient.blood_type || "") as BloodType | "",
        date_of_birth: patient.date_of_birth || "",
        address: patient.address || "",
        emergency_contact: patient.emergency_contact || "",
        insurance_info: patient.insurance_info || "",
      })
      setErrors({})
      setError(null)
    }
  }, [isOpen, patient])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    // Phone validation (optional, but if provided should be valid)
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format"
    }

    // Age validation
    if (formData.age) {
      const ageNum = parseInt(formData.age)
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
        newErrors.age = "Age must be between 0 and 150"
      }
    }

    // Date of birth validation
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth)
      const today = new Date()
      if (dob > today) {
        newErrors.date_of_birth = "Date of birth cannot be in the future"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updatePatient(patient.id, {
        name: formData.name,
        phone: formData.phone || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        blood_type: formData.blood_type || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || null,
        emergency_contact: formData.emergency_contact || null,
        insurance_info: formData.insurance_info || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      setError("Failed to update patient")
    } finally {
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
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-zinc-900"
            >
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Edit Patient</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Update patient information
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Basic Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value })
                          if (errors.name) setErrors({ ...errors, name: "" })
                        }}
                        placeholder="John Doe"
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Phone</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value })
                          if (errors.phone) setErrors({ ...errors, phone: "" })
                        }}
                        placeholder="+1 (555) 123-4567"
                        className={errors.phone ? "border-red-500" : ""}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Age</label>
                      <Input
                        type="number"
                        value={formData.age}
                        onChange={(e) => {
                          setFormData({ ...formData, age: e.target.value })
                          if (errors.age) setErrors({ ...errors, age: "" })
                        }}
                        placeholder="35"
                        min="0"
                        max="150"
                        className={errors.age ? "border-red-500" : ""}
                      />
                      {errors.age && (
                        <p className="mt-1 text-xs text-red-600">{errors.age}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Medical Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                        className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-zinc-800"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Blood Type</label>
                      <select
                        value={formData.blood_type}
                        onChange={(e) => setFormData({ ...formData, blood_type: e.target.value as BloodType })}
                        className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-zinc-800"
                      >
                        <option value="">Select blood type</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Date of Birth</label>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => {
                          setFormData({ ...formData, date_of_birth: e.target.value })
                          if (errors.date_of_birth) setErrors({ ...errors, date_of_birth: "" })
                        }}
                        className={errors.date_of_birth ? "border-red-500" : ""}
                      />
                      {errors.date_of_birth && (
                        <p className="mt-1 text-xs text-red-600">{errors.date_of_birth}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact & Insurance */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Contact & Insurance
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Address</label>
                      <Input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Emergency Contact</label>
                      <Input
                        type="text"
                        value={formData.emergency_contact}
                        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                        placeholder="Jane Doe - +1 (555) 987-6543"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Insurance Info</label>
                      <Input
                        type="text"
                        value={formData.insurance_info}
                        onChange={(e) => setFormData({ ...formData, insurance_info: e.target.value })}
                        placeholder="Provider: Blue Cross, Policy #: 123456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
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
                    type="submit"
                    className="flex-1"
                    disabled={isLoading || !formData.name.trim()}
                  >
                    {isLoading ? "Updating..." : "Update Patient"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

