"use client"

import { useState } from "react"
import { X, Loader2, Link as LinkIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { createClient } from "@/lib/supabase/client"

interface WebsiteShortcutModalProps {
  folderId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function WebsiteShortcutModal({ folderId, onClose, onSuccess }: WebsiteShortcutModalProps) {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleScrapeMetadata = async () => {
    if (!url || !validateUrl(url)) {
      setError("Please enter a valid URL")
      return
    }

    setScraping(true)
    setError(null)

    try {
      // For now, just extract basic info from the URL
      // In a real implementation, you would call an API endpoint to scrape the page
      const urlObj = new URL(url)
      
      // Set a default title if not already set
      if (!title) {
        setTitle(urlObj.hostname)
      }
    } catch (err: any) {
      setError("Failed to process URL")
    } finally {
      setScraping(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url || !validateUrl(url)) {
      setError("Please enter a valid URL")
      return
    }

    if (!title.trim()) {
      setError("Please enter a title")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Insert website shortcut (only essential content fields)
      const { data: insertedWebsite, error: dbError } = await supabase.from("website_shortcuts").insert({
        user_id: user.id,
        folder_id: folderId,
        url,
        title: title.trim(),
        description: description.trim() || null,
        embedding_status: "pending",
      }).select().single()

      if (dbError) throw dbError

      // Trigger embedding generation in background
      fetch("/api/embeddings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: insertedWebsite.id }),
      }).catch(err => {
        console.error("Failed to trigger embedding generation:", err)
      })

      // Wait for onSuccess to complete (if it's async)
      await Promise.resolve(onSuccess())
      // Small delay to ensure UI updates
      setTimeout(() => {
        onClose()
      }, 300)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleUrlBlur = () => {
    if (url && !title) {
      handleScrapeMetadata()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Add Website</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 hover:bg-white/10 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">URL *</label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              disabled={loading || scraping}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Title * {scraping && <span className="text-xs text-gray-500">(loading...)</span>}
            </label>
            <Input
              type="text"
              placeholder="Enter a title for this website"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading || scraping}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description (optional)</label>
            <textarea
              placeholder="Add a description or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading || scraping}
              rows={3}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={loading || scraping}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || scraping || !url || !title} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Website"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

