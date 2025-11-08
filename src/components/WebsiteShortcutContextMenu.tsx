"use client"

import { useState } from "react"
import { MoreVertical, Trash2, ExternalLink } from "lucide-react"
import { Button } from "./ui/button"
import { createClient } from "@/lib/supabase/client"

interface WebsiteShortcutContextMenuProps {
  shortcutId: string
  title: string
  url: string
  onDelete: () => void
}

export function WebsiteShortcutContextMenu({ 
  shortcutId, 
  title, 
  url,
  onDelete 
}: WebsiteShortcutContextMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    setDeleting(true)

    try {
      // Delete embeddings
      await supabase
        .from("embeddings")
        .delete()
        .eq("website_id", shortcutId)

      // Delete from database
      const { error } = await supabase
        .from("website_shortcuts")
        .delete()
        .eq("id", shortcutId)

      if (error) throw error

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
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ExternalLink className="h-4 w-4" />
                Open Link
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  setShowConfirm(true)
                }}
                className="flex w-full items-center gap-2 border-t border-black/10 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-950/20"
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
            <h2 className="mb-2 text-lg font-semibold">Delete Website</h2>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete <strong>"{title}"</strong>? This action cannot be undone.
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

