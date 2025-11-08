"use client"

import { useState } from "react"
import { MoreVertical, Trash2, Download } from "lucide-react"
import { Button } from "./ui/button"
import { createClient } from "@/lib/supabase/client"

interface FileContextMenuProps {
  fileId: string
  fileName: string
  storagePath: string
  onDelete: () => void
}

export function FileContextMenu({ fileId, fileName, storagePath, onDelete }: FileContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    setDeleting(true)

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([storagePath])

      if (storageError) throw storageError

      // Delete embeddings
      await supabase
        .from("embeddings")
        .delete()
        .eq("file_id", fileId)

      // Delete from database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", fileId)

      if (dbError) throw dbError

      onDelete()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="h-8 w-8 p-0"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-900">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  setShowConfirm(true)
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-semibold">Delete File</h2>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete <strong>"{fileName}"</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

