"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus } from "lucide-react"
import Link from "next/link"
import type { Folder as FolderType } from "@/types/database.types"
import { Button } from "./ui/button"

interface FolderNode extends FolderType {
  children: FolderNode[]
}

interface FolderTreeProps {
  folders: FolderType[]
  currentPath: string
  onCreateFolder: (parentId: string | null) => void
}

export function FolderTree({ folders, currentPath, onCreateFolder }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Auto-expand folders in the current path
  useEffect(() => {
    if (folders.length === 0) return

    if (!currentPath) {
      setExpandedFolders(new Set())
      return
    }

    const pathSegments = currentPath.split('/')
    const foldersToExpand = new Set<string>()
    
    // Find all parent folders in the current path and expand them
    let currentParentId: string | null = null
    
    for (const slug of pathSegments) {
      const folder = folders.find(f => 
        f.slug === slug && 
        (currentParentId ? f.parent_id === currentParentId : f.parent_id === null)
      )
      
      if (folder) {
        foldersToExpand.add(folder.id)
        currentParentId = folder.id
      }
    }

    setExpandedFolders(prev => {
      // Merge with existing to preserve manual toggles
      const merged = new Set([...prev, ...foldersToExpand])
      return merged
    })
  }, [currentPath, folders])

  // Build folder tree structure
  const buildTree = (folders: FolderType[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>()
    const rootFolders: FolderNode[] = []

    // Initialize all folders in the map
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Build parent-child relationships
    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!
      if (folder.parent_id === null) {
        rootFolders.push(node)
      } else {
        const parent = folderMap.get(folder.parent_id)
        if (parent) {
          parent.children.push(node)
        }
      }
    })

    return rootFolders
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const buildFolderPath = (folder: FolderNode): string => {
    const path: string[] = []
    let current: FolderNode | undefined = folder
    
    while (current) {
      path.unshift(current.slug)
      if (current.parent_id) {
        current = folders.find(f => f.id === current!.parent_id) as FolderNode
      } else {
        current = undefined
      }
    }
    
    return path.join('/')
  }

  // Check if folder is in the current path (active or parent of active)
  const isInActivePath = (folderPath: string): boolean => {
    if (!currentPath) return false
    return currentPath === folderPath || currentPath.startsWith(folderPath + '/')
  }

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const hasChildren = folder.children.length > 0
    const folderPath = buildFolderPath(folder)
    const isActive = currentPath === folderPath
    const inActivePath = isInActivePath(folderPath)

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
            isActive ? 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 
            inActivePath ? 'bg-black/5 dark:bg-white/5' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="flex h-5 w-5 items-center justify-center hover:bg-black/10 rounded dark:hover:bg-white/10"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <Link
            href={`/vault/${folderPath}`}
            className="flex flex-1 items-center gap-2 overflow-hidden"
          >
            {isExpanded || inActivePath ? (
              <FolderOpen className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            ) : (
              <Folder className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            )}
            <span className="truncate">{folder.name}</span>
          </Link>
        </div>

        {isExpanded && hasChildren && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-black/10 dark:bg-white/10" style={{ marginLeft: `${level * 16}px` }} />
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const tree = buildTree(folders)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <h2 className="text-sm font-semibold">Folders</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCreateFolder(null)}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <Link
          href="/vault"
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
            currentPath === '' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <Folder className="h-4 w-4" />
          <span>Home</span>
        </Link>

        {tree.length > 0 && (
          <>
            <div className="mx-2 my-3 h-px bg-black/10 dark:bg-white/10" />
            <div className="space-y-0.5">
              {tree.map(folder => renderFolder(folder))}
            </div>
          </>
        )}

        {tree.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-500">
            No folders yet
          </div>
        )}
      </div>
    </div>
  )
}

