"use client"

import { useState } from "react"
import { User, Phone, Droplet, Calendar, MapPin, AlertCircle, FileText, Edit2, Save, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { updatePatient } from "@/lib/actions/patients"
import type { Patient, Gender, BloodType } from "@/types/database.types"

interface PatientHeaderProps {
  patient: Patient
}

export default function PatientHeader({ patient: initialPatient }: PatientHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [patient, setPatient] = useState(initialPatient)
  const [formData, setFormData] = useState({
    name: patient.name,
    phone: patient.phone || "",
    age: patient.age?.toString() || "",
    gender: patient.gender || "",
    blood_type: patient.blood_type || "",
    date_of_birth: patient.date_of_birth || "",
    address: patient.address || "",
    emergency_contact: patient.emergency_contact || "",
    insurance_info: patient.insurance_info || "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const result = await updatePatient(patient.id, {
        name: formData.name,
        phone: formData.phone || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: (formData.gender as Gender) || null,
        blood_type: (formData.blood_type as BloodType) || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || null,
        emergency_contact: formData.emergency_contact || null,
        insurance_info: formData.insurance_info || null,
      })

      if (result.data) {
        setPatient(result.data)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Failed to update patient:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: patient.name,
      phone: patient.phone || "",
      age: patient.age?.toString() || "",
      gender: patient.gender || "",
      blood_type: patient.blood_type || "",
      date_of_birth: patient.date_of_birth || "",
      address: patient.address || "",
      emergency_contact: patient.emergency_contact || "",
      insurance_info: patient.insurance_info || "",
    })
    setIsEditing(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not provided"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {/* Main Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-950/30 dark:to-purple-950/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mb-1 text-2xl font-bold"
                />
              ) : (
                <h1 className="text-2xl font-bold">{patient.name}</h1>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                {isEditing ? (
                  <>
                    <Input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Age"
                      className="w-20"
                    />
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-800"
                    >
                      <option value="">Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </>
                ) : (
                  <>
                    {patient.age && <span>{patient.age} years old</span>}
                    {patient.gender && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{patient.gender.replace(/_/g, " ")}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Phone */}
        <div className="flex items-start gap-3">
          <Phone className="mt-1 h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Phone</p>
            {isEditing ? (
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            ) : (
              <p className="text-sm font-medium">{patient.phone || "Not provided"}</p>
            )}
          </div>
        </div>

        {/* Blood Type */}
        <div className="flex items-start gap-3">
          <Droplet className="mt-1 h-4 w-4 text-red-500" />
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Blood Type</p>
            {isEditing ? (
              <select
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                className="w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-800"
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            ) : (
              <p className="text-sm font-medium">{patient.blood_type || "Not provided"}</p>
            )}
          </div>
        </div>

        {/* Date of Birth */}
        <div className="flex items-start gap-3">
          <Calendar className="mt-1 h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Date of Birth</p>
            {isEditing ? (
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            ) : (
              <p className="text-sm font-medium">{formatDate(patient.date_of_birth)}</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Address</p>
            {isEditing ? (
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Address"
              />
            ) : (
              <p className="text-sm font-medium">{patient.address || "Not provided"}</p>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-4 w-4 text-orange-500" />
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Emergency Contact</p>
            {isEditing ? (
              <Input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="Emergency contact"
              />
            ) : (
              <p className="text-sm font-medium">{patient.emergency_contact || "Not provided"}</p>
            )}
          </div>
        </div>

        {/* Insurance */}
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Insurance</p>
            {isEditing ? (
              <Input
                type="text"
                value={formData.insurance_info}
                onChange={(e) => setFormData({ ...formData, insurance_info: e.target.value })}
                placeholder="Insurance info"
              />
            ) : (
              <p className="text-sm font-medium">{patient.insurance_info || "Not provided"}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

