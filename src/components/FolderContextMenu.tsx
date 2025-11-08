"use client"

import { useState } from "react"
import { MoreVertical, Trash2, Edit2 } from "lucide-react"
import { Button } from "./ui/button"
import { deleteFolder } from "@/lib/actions/folders"

interface FolderContextMenuProps {
  folderId: string
  folderName: string
  onDelete: () => void
}

export function FolderContextMenu({ folderId, folderName, onDelete }: FolderContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${folderName}"? This will also delete all files and subfolders inside.`)) {
      return
    }

    setDeleting(true)
    const result = await deleteFolder(folderId)
    
    if (result.error) {
      alert(`Error: ${result.error}`)
      setDeleting(false)
    } else {
      onDelete()
    }
  }

  return (
    <div className="relative">
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
                handleDelete()
                setShowMenu(false)
              }}
              disabled={deleting}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

