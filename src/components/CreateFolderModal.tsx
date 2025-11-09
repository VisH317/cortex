"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { createFolder } from "@/lib/actions/folders"

interface CreateFolderModalProps {
  parentId: string | null
  patientId?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function CreateFolderModal({ parentId, patientId = null, onClose, onSuccess }: CreateFolderModalProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    const result = await createFolder(name.trim(), parentId, patientId)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create New Folder</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Folder Name</label>
            <Input
              type="text"
              placeholder="Enter folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

