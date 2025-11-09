// @ts-nocheck
"use client"

import { useState, useRef } from "react"
import { X, Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { createClient } from "@/lib/supabase/client"
import { 
  classifyFileType, 
  validateFile, 
  formatFileSize, 
  isTextOrCodeFile,
  isSupportedMediaFile 
} from "@/lib/utils/file-utils"

interface FileUploadModalProps {
  folderId: string | null
  patientId?: string | null
  onClose: () => void
  onSuccess: () => void
}

interface FileWithProgress {
  file: File
  id: string
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
}

export function FileUploadModal({ folderId, patientId = null, onClose, onSuccess }: FileUploadModalProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles
      .filter(file => {
        // Allow text, code, PDFs, images, audio, and video
        const isPDF = file.type === "application/pdf"
        const isTextOrCode = isTextOrCodeFile(file.type, file.name)
        const isMedia = isSupportedMediaFile(file.type, file.name)
        
        if (!isTextOrCode && !isPDF && !isMedia) {
          console.warn(`Skipping ${file.name}: unsupported file type`)
          return false
        }
        
        const validation = validateFile(file)
        if (!validation.valid) {
          console.warn(`Skipping ${file.name}: ${validation.error}`)
          return false
        }
        return true
      })
      .map(file => ({
        file,
        id: crypto.randomUUID(),
        progress: 0,
        status: "pending" as const,
      }))

    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("You must be logged in to upload files")
      setUploading(false)
      return
    }

    let successCount = 0

    // Upload files sequentially
    for (const fileItem of files) {
      if (fileItem.status !== "pending") continue

      try {
        // Update status to uploading
        setFiles(prev =>
          prev.map(f => (f.id === fileItem.id ? { ...f, status: "uploading" as const } : f))
        )

        const fileId = crypto.randomUUID()
        const storagePath = `${user.id}/${fileId}/${fileItem.file.name}`

        // Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
          .from("files")
          .upload(storagePath, fileItem.file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (storageError) throw storageError

        // Save metadata to database
        const fileType = classifyFileType(fileItem.file.type, fileItem.file.name)
        const { data: insertedFile, error: dbError } = await supabase.from("files").insert({
          user_id: user.id,
          folder_id: folderId,
          patient_id: patientId,
          name: fileItem.file.name,
          type: fileType,
          mime_type: fileItem.file.type || "application/octet-stream",
          size_bytes: fileItem.file.size,
          storage_path: storagePath,
          embedding_status: "pending",
        }).select().single()

        if (dbError) throw dbError

        // Update status to success
        setFiles(prev =>
          prev.map(f => (f.id === fileItem.id ? { ...f, status: "success" as const, progress: 100 } : f))
        )

        successCount++

        // Trigger embedding generation in background for supported file types
        const supportedTypes = ["document", "code", "image", "audio", "video"]
        if (supportedTypes.includes(fileType)) {
          fetch("/api/embeddings/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: insertedFile.id }),
          }).catch(err => {
            console.error("Failed to trigger embedding generation:", err)
          })
        }
      } catch (error: any) {
        console.error("Upload error:", error)
        setFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? { ...f, status: "error" as const, error: error.message }
              : f
          )
        )
      }
    }

    setUploading(false)

    // Check if any uploads succeeded
    if (successCount > 0) {
      // Wait for onSuccess to complete (if it's async)
      await Promise.resolve(onSuccess())
      // Small delay to ensure UI updates
      setTimeout(() => {
        onClose()
      }, 300)
    }
  }

  const canUpload = files.length > 0 && !uploading && files.some(f => f.status === "pending")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold">Upload Files</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-1 hover:bg-white/10 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Drop Zone */}
          <div
            className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-black/40"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-sm font-medium">Drag and drop files here</p>
            <p className="mb-4 text-xs text-gray-600">
              Supports documents, code, PDFs, images, audio, and video
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select Files
            </Button>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {files.length} {files.length === 1 ? "file" : "files"} selected
                </p>
                {!uploading && (
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-gray-600 hover:text-black"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {files.map(fileItem => (
                  <div
                    key={fileItem.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{fileItem.file.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                    </div>
                    
                    {fileItem.status === "pending" && !uploading && (
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        className="shrink-0 rounded p-1 hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    
                    {fileItem.status === "uploading" && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                    )}
                    
                    {fileItem.status === "success" && (
                      <div className="shrink-0 text-green-600">✓</div>
                    )}
                    
                    {fileItem.status === "error" && (
                      <div className="shrink-0 text-red-600" title={fileItem.error}>
                        ✕
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={uploadFiles} disabled={!canUpload}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.filter(f => f.status === "pending").length} file${files.filter(f => f.status === "pending").length !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

