"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { InsertPatient, UpdatePatient, Patient } from "@/types/database.types"

/**
 * Create a new patient
 */
export async function createPatient(data: Omit<InsertPatient, "user_id">) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      ...data,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating patient:", error)
    return { error: error.message }
  }

  revalidatePath("/")
  return { data: patient }
}

/**
 * Get all patients for the current user
 */
export async function getPatients() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching patients:", error)
    return { error: error.message }
  }

  return { data: patients }
}

/**
 * Get a single patient by ID
 */
export async function getPatientById(patientId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .eq("user_id", user.id)
    .single()

  if (error) {
    console.error("Error fetching patient:", error)
    return { error: error.message }
  }

  return { data: patient }
}

/**
 * Update a patient
 */
export async function updatePatient(patientId: string, updates: UpdatePatient) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .update(updates)
    .eq("id", patientId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating patient:", error)
    return { error: error.message }
  }

  revalidatePath("/")
  revalidatePath(`/patient/${patientId}`)
  return { data: patient }
}

/**
 * Delete a patient and all associated data
 */
export async function deletePatient(patientId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Delete patient (CASCADE will handle folders, files, chat sessions, etc.)
  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error deleting patient:", error)
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

/**
 * Search patients by name or phone
 */
export async function searchPatients(query: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", user.id)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error searching patients:", error)
    return { error: error.message }
  }

  return { data: patients }
}

/**
 * Get patient stats (for display purposes)
 */
export async function getPatientStats(patientId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get file count
  const { count: fileCount } = await supabase
    .from("files")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("user_id", user.id)

  // Get folder count
  const { count: folderCount } = await supabase
    .from("folders")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("user_id", user.id)

  return {
    data: {
      fileCount: fileCount || 0,
      folderCount: folderCount || 0,
    }
  }
}

