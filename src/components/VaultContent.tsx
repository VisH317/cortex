// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  FileText,
  Link as LinkIcon,
  FolderPlus,
  Search,
  Grid3x3,
  List,
  Folder as FolderIcon,
  Code,
  ChevronRight,
  MoreVertical,
  Trash2,
  Download,
  Edit,
  Image as ImageIcon,
  Music,
  Video,
  FolderTree as FolderTreeIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { FolderTree } from "./FolderTree"
import { CreateFolderModal } from "./CreateFolderModal"
import { FileUploadModal } from "./FileUploadModal"
import { WebsiteShortcutModal } from "./WebsiteShortcutModal"
import { FolderContextMenu } from "./FolderContextMenu"
import { FileContextMenu } from "./FileContextMenu"
import { WebsiteShortcutContextMenu } from "./WebsiteShortcutContextMenu"
import ImageAnalysisModal from "./ImageAnalysisModal"
import type { Folder, File as FileType, WebsiteShortcut } from "@/types/database.types"
import { buildSlugPath } from "@/lib/utils/slugify"
import { moveFile, moveWebsiteShortcut } from "@/lib/actions/files"

interface VaultContentProps {
  currentFolder: Folder | null
  folders: Folder[]
  files: FileType[]
  shortcuts: WebsiteShortcut[]
  slugPath: string[]
  patientId?: string | null
}

export default function VaultContent({
  currentFolder,
  folders: initialFolders,
  files: initialFiles,
  shortcuts: initialShortcuts,
  slugPath,
  patientId = null,
}: VaultContentProps) {
  const [allFolders, setAllFolders] = useState<Folder[]>([])
  const [folders, setFolders] = useState(initialFolders)
  const [files, setFiles] = useState(initialFiles)
  const [shortcuts, setShortcuts] = useState(initialShortcuts)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showWebsiteModal, setShowWebsiteModal] = useState(false)
  const [draggedItem, setDraggedItem] = useState<{ type: string; id: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [breadcrumbFolders, setBreadcrumbFolders] = useState<Map<number, string>>(new Map())
  const [selectedFileForAnalysis, setSelectedFileForAnalysis] = useState<FileType | null>(null)
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchAllFolders()
    // Update local state when props change
    setFolders(initialFolders)
    setFiles(initialFiles)
    setShortcuts(initialShortcuts)
    
    // Build breadcrumb folder ID map
    buildBreadcrumbMap()
  }, [initialFolders, initialFiles, initialShortcuts, slugPath, patientId])

  const buildBreadcrumbMap = async () => {
    if (slugPath.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const folderMap = new Map<number, string>()
    
    // Navigate through path to get each folder's ID
    let currentParentId: string | null = null
    
    for (let i = 0; i < slugPath.length; i++) {
      const slug = slugPath[i]
      
      let query = supabase
        .from("folders")
        .select("id")
        .eq("user_id", user.id)
        .eq("slug", slug)
      
      if (currentParentId) {
        query = query.eq("parent_id", currentParentId)
      } else {
        query = query.is("parent_id", null)
      }
      
      if (patientId) {
        query = query.eq("patient_id", patientId)
      } else {
        query = query.is("patient_id", null)
      }
      
      const { data } = await query.single()
      
      if (data) {
        folderMap.set(i, data.id)
        currentParentId = data.id
      }
    }
    
    setBreadcrumbFolders(folderMap)
  }

  const fetchAllFolders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
    
    if (patientId) {
      query = query.eq("patient_id", patientId)
    } else {
      query = query.is("patient_id", null)
    }
    
    const { data } = await query.order("name")
    if (data) setAllFolders(data)
  }

  const refetchContent = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const folderId = currentFolder?.id || null

    // Refetch folders
    let foldersQuery = supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)

    if (folderId) {
      foldersQuery = foldersQuery.eq("parent_id", folderId)
    } else {
      foldersQuery = foldersQuery.is("parent_id", null)
    }

    if (patientId) {
      foldersQuery = foldersQuery.eq("patient_id", patientId)
    } else {
      foldersQuery = foldersQuery.is("patient_id", null)
    }

    const { data: foldersData } = await foldersQuery.order("name", { ascending: true })

    // Refetch files
    let filesQuery = supabase
      .from("files")
      .select("*")
      .eq("user_id", user.id)

    if (folderId) {
      filesQuery = filesQuery.eq("folder_id", folderId)
    } else {
      filesQuery = filesQuery.is("folder_id", null)
    }

    if (patientId) {
      filesQuery = filesQuery.eq("patient_id", patientId)
    } else {
      filesQuery = filesQuery.is("patient_id", null)
    }

    const { data: filesData } = await filesQuery.order("created_at", { ascending: false })

    // Refetch shortcuts
    let shortcutsQuery = supabase
      .from("website_shortcuts")
      .select("*")
      .eq("user_id", user.id)

    if (folderId) {
      shortcutsQuery = shortcutsQuery.eq("folder_id", folderId)
    } else {
      shortcutsQuery = shortcutsQuery.is("folder_id", null)
    }

    const { data: shortcutsData } = await shortcutsQuery.order("created_at", { ascending: false })

    if (foldersData) setFolders(foldersData)
    if (filesData) setFiles(filesData)
    if (shortcutsData) setShortcuts(shortcutsData)
    
    // Also refresh the folder tree sidebar
    await fetchAllFolders()
  }


  const handleDragStart = (e: React.DragEvent, itemType: string, itemId: string) => {
    setDraggedItem({ type: itemType, id: itemId })
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDropTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, targetType: string, targetId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(targetId || "breadcrumb")
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedItem) return

    // Move the item
    if (draggedItem.type === "file") {
      await moveFile(draggedItem.id, targetFolderId)
    } else if (draggedItem.type === "shortcut") {
      await moveWebsiteShortcut(draggedItem.id, targetFolderId)
    }

    // Refresh
    await refetchContent()
    router.refresh()
    
    setDraggedItem(null)
    setDropTarget(null)
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "code":
        return <Code className="h-6 w-6 text-blue-600" />
      case "image":
        return <ImageIcon className="h-6 w-6 text-green-600" />
      case "audio":
        return <Music className="h-6 w-6 text-purple-600" />
      case "video":
        return <Video className="h-6 w-6 text-red-600" />
      default:
        return <FileText className="h-6 w-6 text-gray-600" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleAnalyzeImage = async (file: FileType) => {
    // Get signed URL for the image
    const { data: signedUrlData } = await supabase.storage
      .from("files")
      .createSignedUrl(file.storage_path, 3600)

    if (signedUrlData) {
      setAnalysisImageUrl(signedUrlData.signedUrl)
      setSelectedFileForAnalysis(file)
    }
  }

  const currentPath = buildSlugPath(slugPath)
  const allItems = [
    ...folders.map((f) => ({ ...f, itemType: "folder" as const })),
    ...files.map((f) => ({ ...f, itemType: "file" as const })),
    ...shortcuts.map((s) => ({ ...s, itemType: "shortcut" as const })),
  ]

  const isEmpty = allItems.length === 0

  return (
    <div className="flex h-full bg-gradient-to-br from-blue-50/30 via-white to-orange-50/30">
      {/* Sidebar */}
      <div className="w-64 border-r-2 border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex h-16 items-center gap-3 border-b-2 border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <FolderTreeIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-800">Medical Records</span>
        </div>
        <FolderTree
          folders={allFolders}
          currentPath={currentPath}
          onCreateFolder={() => setShowCreateFolder(true)}
          patientId={patientId}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b-2 border-gray-200 bg-white/80 px-6 backdrop-blur-sm">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push(patientId ? `/patient/${patientId}` : "/")}
              onDragOver={(e) => handleDragOver(e, "breadcrumb", "root")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
              className={`rounded px-2 py-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-black ${
                dropTarget === "root" ? "bg-blue-50 text-blue-600" : ""
              }`}
            >
              Home
            </button>
            {slugPath.map((slug, idx) => {
              // Get the folder ID for this breadcrumb
              const breadcrumbPath = slugPath.slice(0, idx + 1)
              const folderId = breadcrumbFolders.get(idx)
              const displayName = idx === slugPath.length - 1 && currentFolder ? currentFolder.name : slug
              const targetPath = patientId 
                ? `/patient/${patientId}/${buildSlugPath(breadcrumbPath)}`
                : `/${buildSlugPath(breadcrumbPath)}`
              
              return (
                <div key={idx} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <button
                    onClick={() => router.push(targetPath)}
                    onDragOver={(e) => handleDragOver(e, "breadcrumb", folderId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folderId || null)}
                    className={`rounded px-2 py-1 transition-colors ${
                      idx === slugPath.length - 1
                        ? "font-medium"
                        : "text-gray-600 hover:bg-white/5 hover:text-black"
                    } ${dropTarget === folderId ? "bg-blue-50 text-blue-600" : ""}`}
                  >
                    {displayName}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex items-center gap-3 border-b-2 border-gray-200 bg-white/80 px-6 py-5 backdrop-blur-sm">
          <Button className="gap-2" onClick={() => setShowFileUpload(true)}>
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowWebsiteModal(true)}>
            <LinkIcon className="h-4 w-4" />
            Add Website
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowCreateFolder(true)}>
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {isEmpty ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-gray-100 p-6">
                    <FolderIcon className="h-12 w-12 text-gray-400" />
                  </div>
                </div>
                <h2 className="mb-2 text-2xl font-bold">
                  {currentFolder ? `${currentFolder.name} is empty` : "Your vault is empty"}
                </h2>
                <p className="mb-6 text-gray-600">
                  Start by uploading files, adding website shortcuts, or creating folders
                </p>
                <div className="flex justify-center gap-3">
                  <Button className="gap-2" onClick={() => setShowFileUpload(true)}>
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => setShowCreateFolder(true)}>
                    <FolderPlus className="h-4 w-4" />
                    Create Folder
                  </Button>
                </div>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {allItems.map((item) => {
                if (item.itemType === "folder") {
                  return (
                    <div
                      key={item.id}
                      onDoubleClick={() => {
                        const newPath = currentPath ? `${currentPath}/${item.slug}` : item.slug
                        const targetUrl = patientId ? `/patient/${patientId}/${newPath}` : `/${newPath}`
                        router.push(targetUrl)
                      }}
                      onDragOver={(e) => handleDragOver(e, "folder", item.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={`group relative cursor-pointer rounded-3xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 hover:shadow-xl ${
                        dropTarget === item.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <FolderContextMenu
                          folderId={item.id}
                          folderName={item.name}
                          onDelete={() => {
                            refetchContent()
                            router.refresh()
                          }}
                        />
                      </div>
                      <div className="mb-4 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50">
                        <FolderIcon className="h-14 w-14 text-blue-600" strokeWidth={1.5} />
                      </div>
                      <h3 className="truncate text-sm font-medium" title={item.name}>
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">Double-click to open</p>
                    </div>
                  )
                }

                if (item.itemType === "file") {
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, "file", item.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/vault/file/${item.id}`)}
                      className={`group relative cursor-pointer rounded-3xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 hover:shadow-xl ${
                        draggedItem?.id === item.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <FileContextMenu
                          fileId={item.id}
                          fileName={item.name}
                          storagePath={item.storage_path}
                          mimeType={item.mime_type}
                          onDelete={() => {
                            refetchContent()
                            router.refresh()
                          }}
                          onAnalyzeImage={() => handleAnalyzeImage(item)}
                        />
                      </div>
                      <div className="mb-4 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
                        {getFileIcon(item.type)}
                      </div>
                      <h3 className="truncate text-sm font-medium" title={item.name}>
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(item.size_bytes)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(item.created_at)}</p>
                    </div>
                  )
                }

                // Website shortcut
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "shortcut", item.id)}
                    onDragEnd={handleDragEnd}
                    className={`group relative cursor-pointer rounded-3xl border-2 border-gray-200 bg-white p-5 transition-all hover:border-orange-300 hover:shadow-xl ${
                      draggedItem?.id === item.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <WebsiteShortcutContextMenu
                        shortcutId={item.id}
                        title={item.title}
                        url={item.url}
                        onDelete={() => {
                          refetchContent()
                          router.refresh()
                        }}
                      />
                    </div>
                    <div 
                      onClick={() => window.open(item.url, "_blank")}
                      className="cursor-pointer"
                    >
                      <div className="mb-4 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50">
                        <LinkIcon className="h-10 w-10 text-orange-600" strokeWidth={2} />
                      </div>
                      <h3 className="truncate text-sm font-medium" title={item.title}>
                        {item.title}
                      </h3>
                      <p className="truncate text-xs text-gray-600">
                        {new URL(item.url).hostname}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {allItems.map((item) => {
                if (item.itemType === "folder") {
                  return (
                    <div
                      key={item.id}
                      onDoubleClick={() => {
                        const newPath = currentPath ? `${currentPath}/${item.slug}` : item.slug
                        const targetUrl = patientId ? `/patient/${patientId}/${newPath}` : `/${newPath}`
                        router.push(targetUrl)
                      }}
                      onDragOver={(e) => handleDragOver(e, "folder", item.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-lg border bg-white p-4 text-left transition-all hover:border-gray-300 ${
                        dropTarget === item.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <FolderIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">Double-click to open</p>
                      </div>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <FolderContextMenu
                          folderId={item.id}
                          folderName={item.name}
                          onDelete={() => {
                            refetchContent()
                            router.refresh()
                          }}
                        />
                      </div>
                    </div>
                  )
                }

                if (item.itemType === "file") {
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, "file", item.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/vault/file/${item.id}`)}
                      className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 ${
                        draggedItem?.id === item.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                        {getFileIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">
                          {item.type} • {formatFileSize(item.size_bytes)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">{formatDate(item.created_at)}</div>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <FileContextMenu
                          fileId={item.id}
                          fileName={item.name}
                          storagePath={item.storage_path}
                          mimeType={item.mime_type}
                          onDelete={() => {
                            refetchContent()
                            router.refresh()
                          }}
                          onAnalyzeImage={() => handleAnalyzeImage(item)}
                        />
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "shortcut", item.id)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 ${
                      draggedItem?.id === item.id ? "opacity-50" : ""
                    }`}
                  >
                    <div 
                      onClick={() => window.open(item.url, "_blank")}
                      className="flex flex-1 cursor-pointer items-center gap-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                        <LinkIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.url}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">{formatDate(item.created_at)}</div>
                    </div>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <WebsiteShortcutContextMenu
                        shortcutId={item.id}
                        title={item.title}
                        url={item.url}
                        onDelete={() => {
                          refetchContent()
                          router.refresh()
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          parentId={currentFolder?.id || null}
          patientId={patientId}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => {
            router.refresh()
            fetchAllFolders()
          }}
        />
      )}

      {showFileUpload && (
        <FileUploadModal
          folderId={currentFolder?.id || null}
          patientId={patientId}
          onClose={() => setShowFileUpload(false)}
          onSuccess={async () => {
            await refetchContent()
            router.refresh()
          }}
        />
      )}

      {showWebsiteModal && (
        <WebsiteShortcutModal
          folderId={currentFolder?.id || null}
          onClose={() => setShowWebsiteModal(false)}
          onSuccess={async () => {
            await refetchContent()
            router.refresh()
          }}
        />
      )}

      {/* Image Analysis Modal */}
      {selectedFileForAnalysis && (
        <ImageAnalysisModal
          fileId={selectedFileForAnalysis.id}
          fileName={selectedFileForAnalysis.name}
          imageUrl={analysisImageUrl}
          isOpen={!!selectedFileForAnalysis}
          onClose={() => {
            setSelectedFileForAnalysis(null)
            setAnalysisImageUrl(null)
          }}
        />
      )}
    </div>
  )
}

