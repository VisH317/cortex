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
  }, [initialFolders, initialFiles, initialShortcuts, slugPath])

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
    let query = supabase.from("folders").select("*")
    
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
        return <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      case "image":
        return <ImageIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
      case "audio":
        return <Music className="h-6 w-6 text-purple-600 dark:text-purple-400" />
      case "video":
        return <Video className="h-6 w-6 text-red-600 dark:text-red-400" />
      default:
        return <FileText className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
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

  const currentPath = buildSlugPath(slugPath)
  const allItems = [
    ...folders.map((f) => ({ ...f, itemType: "folder" as const })),
    ...files.map((f) => ({ ...f, itemType: "file" as const })),
    ...shortcuts.map((s) => ({ ...s, itemType: "shortcut" as const })),
  ]

  const isEmpty = allItems.length === 0

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 border-r border-black/10 bg-white dark:border-white/10 dark:bg-black">
        <div className="flex h-16 items-center gap-2 border-b border-black/10 px-4 dark:border-white/10">
          <FolderTreeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Medical Records</span>
        </div>
        <FolderTree
          folders={allFolders}
          currentPath={currentPath}
          onCreateFolder={() => setShowCreateFolder(true)}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-black/10 bg-white px-6 dark:border-white/10 dark:bg-black">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push("/vault")}
              onDragOver={(e) => handleDragOver(e, "breadcrumb", "root")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
              className={`rounded px-2 py-1 text-zinc-600 transition-colors hover:bg-black/5 hover:text-black dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white ${
                dropTarget === "root" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" : ""
              }`}
            >
              Home
            </button>
            {slugPath.map((slug, idx) => {
              // Get the folder ID for this breadcrumb
              const breadcrumbPath = slugPath.slice(0, idx + 1)
              const folderId = breadcrumbFolders.get(idx)
              const displayName = idx === slugPath.length - 1 && currentFolder ? currentFolder.name : slug
              
              return (
                <div key={idx} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                  <button
                    onClick={() => router.push(`/vault/${buildSlugPath(breadcrumbPath)}`)}
                    onDragOver={(e) => handleDragOver(e, "breadcrumb", folderId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folderId || null)}
                    className={`rounded px-2 py-1 transition-colors ${
                      idx === slugPath.length - 1
                        ? "font-medium"
                        : "text-zinc-600 hover:bg-black/5 hover:text-black dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    } ${dropTarget === folderId ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" : ""}`}
                  >
                    {displayName}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
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
        <div className="flex items-center gap-3 border-b border-black/10 bg-white px-6 py-4 dark:border-white/10 dark:bg-black">
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
                  <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-900">
                    <FolderIcon className="h-12 w-12 text-zinc-400" />
                  </div>
                </div>
                <h2 className="mb-2 text-2xl font-bold">
                  {currentFolder ? `${currentFolder.name} is empty` : "Your vault is empty"}
                </h2>
                <p className="mb-6 text-zinc-600 dark:text-zinc-400">
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
                      onDoubleClick={() => router.push(`/vault/${currentPath ? currentPath + '/' : ''}${item.slug}`)}
                      onDragOver={(e) => handleDragOver(e, "folder", item.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={`group relative cursor-pointer rounded-lg border bg-white p-4 text-left transition-all hover:border-black/20 hover:shadow-md dark:bg-zinc-900 dark:hover:border-white/20 ${
                        dropTarget === item.id
                          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-black/10 dark:border-white/10"
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
                      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <FolderIcon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="truncate text-sm font-medium" title={item.name}>
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">Double-click to open</p>
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
                      className={`group relative cursor-pointer rounded-lg border border-black/10 bg-white p-4 text-left transition-all hover:border-black/20 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20 ${
                        draggedItem?.id === item.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <FileContextMenu
                          fileId={item.id}
                          fileName={item.name}
                          storagePath={item.storage_path}
                          onDelete={() => {
                            refetchContent()
                            router.refresh()
                          }}
                        />
                      </div>
                      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
                        {getFileIcon(item.type)}
                      </div>
                      <h3 className="truncate text-sm font-medium" title={item.name}>
                        {item.name}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatFileSize(item.size_bytes)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{formatDate(item.created_at)}</p>
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
                    className={`group relative cursor-pointer rounded-lg border border-black/10 bg-white p-4 transition-all hover:border-black/20 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20 ${
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
                      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <LinkIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="truncate text-sm font-medium" title={item.title}>
                        {item.title}
                      </h3>
                      <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                        {new URL(item.url).hostname}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{formatDate(item.created_at)}</p>
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
                      onDoubleClick={() => router.push(`/vault/${currentPath ? currentPath + '/' : ''}${item.slug}`)}
                      onDragOver={(e) => handleDragOver(e, "folder", item.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-lg border bg-white p-4 text-left transition-all hover:border-black/20 dark:bg-zinc-900 dark:hover:border-white/20 ${
                        dropTarget === item.id
                          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-black/10 dark:border-white/10"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Double-click to open</p>
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
                      className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-lg border border-black/10 bg-white p-4 text-left transition-all hover:border-black/20 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20 ${
                        draggedItem?.id === item.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
                        {getFileIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.type} • {formatFileSize(item.size_bytes)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-zinc-500">{formatDate(item.created_at)}</div>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <FileContextMenu
                          fileId={item.id}
                          fileName={item.name}
                          storagePath={item.storage_path}
                          onDelete={() => {
                            refetchContent()
                            router.refresh()
                          }}
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
                    className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-lg border border-black/10 bg-white p-4 transition-all hover:border-black/20 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20 ${
                      draggedItem?.id === item.id ? "opacity-50" : ""
                    }`}
                  >
                    <div 
                      onClick={() => window.open(item.url, "_blank")}
                      className="flex flex-1 cursor-pointer items-center gap-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.url}</p>
                      </div>
                      <div className="text-right text-sm text-zinc-500">{formatDate(item.created_at)}</div>
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
    </div>
  )
}

