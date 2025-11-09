"use client"

import { useState } from "react"
import { User, Phone, Droplet, Calendar, MapPin, AlertCircle, FileText, Edit2, Save, X, PhoneCall } from "lucide-react"
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
  const [isCalling, setIsCalling] = useState(false)
  const [callStatus, setCallStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleCallPatient = async () => {
    if (!patient.phone) {
      setCallStatus({ message: "No phone number on file", type: 'error' })
      setTimeout(() => setCallStatus(null), 5000)
      return
    }

    setIsCalling(true)
    setCallStatus(null)

    try {
      const response = await fetch("/api/retell/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: patient.id,
          phoneNumber: patient.phone,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setCallStatus({ 
          message: `Call initiated successfully! Call ID: ${result.callId}`, 
          type: 'success' 
        })
        setTimeout(() => setCallStatus(null), 10000)
      } else {
        setCallStatus({ 
          message: `Failed to initiate call: ${result.error}`, 
          type: 'error' 
        })
        setTimeout(() => setCallStatus(null), 5000)
      }
    } catch (error: any) {
      console.error("Error calling patient:", error)
      setCallStatus({ 
        message: `Error: ${error.message}`, 
        type: 'error' 
      })
      setTimeout(() => setCallStatus(null), 5000)
    } finally {
      setIsCalling(false)
    }
  }

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
    <div className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-lg">
      {/* Main Info */}
      <div className="bg-gradient-to-r from-blue-100 via-blue-50 to-orange-50 p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <User className="h-10 w-10 text-white" strokeWidth={2} />
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
                <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
              )}
              <div className="flex items-center gap-3 text-base text-gray-600">
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
                      className="rounded-2xl border-2 border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
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
      <div className="grid gap-6 p-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Phone */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
            <Phone className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">Phone</p>
            {isEditing ? (
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{patient.phone || "Not provided"}</p>
                {patient.phone && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCallPatient}
                    disabled={isCalling}
                    className="h-7 gap-1.5 px-2 text-xs"
                    title="Call patient with AI assistant"
                  >
                    <PhoneCall className="h-3 w-3" />
                    {isCalling ? "Calling..." : "Call"}
                  </Button>
                )}
              </div>
            )}
            {callStatus && (
              <p className={`mt-1 text-xs ${callStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {callStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Blood Type */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100">
            <Droplet className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Blood Type</p>
            {isEditing ? (
              <select
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
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
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100">
            <Calendar className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Date of Birth</p>
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
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Address</p>
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
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100">
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Emergency Contact</p>
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
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Insurance</p>
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

