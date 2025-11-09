import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { chatWithAgent, type ChatMessage } from "@/lib/services/chat-agent"

interface FileNode {
  id: string
  name: string
  type: string
  size_bytes: number
  created_at: string
}

interface FolderNode {
  id: string
  name: string
  slug: string
  created_at: string
  files: FileNode[]
  subfolders: FolderNode[]
}

function buildFileSystemTree(folders: any[], files: any[]): FolderNode[] {
  // Create a map of folders by ID
  const folderMap = new Map<string, FolderNode>()
  
  // Initialize all folders
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      created_at: folder.created_at,
      files: [],
      subfolders: []
    })
  })
  
  // Add files to their respective folders
  files.forEach(file => {
    if (file.folder_id && folderMap.has(file.folder_id)) {
      folderMap.get(file.folder_id)!.files.push({
        id: file.id,
        name: file.name,
        type: file.type,
        size_bytes: file.size_bytes,
        created_at: file.created_at
      })
    }
  })
  
  // Build the tree structure
  const rootFolders: FolderNode[] = []
  
  folders.forEach(folder => {
    const node = folderMap.get(folder.id)!
    if (folder.parent_id === null) {
      rootFolders.push(node)
    } else {
      const parent = folderMap.get(folder.parent_id)
      if (parent) {
        parent.subfolders.push(node)
      }
    }
  })
  
  return rootFolders
}

function formatFileSystemForPrompt(folders: FolderNode[], files: any[], level: number = 0): string {
  let output = ''
  const indent = '  '.repeat(level)
  
  // Add root-level files first (files with no folder_id)
  if (level === 0) {
    const rootFiles = files.filter(f => !f.folder_id)
    if (rootFiles.length > 0) {
      output += 'Root Files:\n'
      rootFiles.forEach(file => {
        output += `  📄 ${file.name} (${file.type}, ${formatBytes(file.size_bytes)})\n`
      })
      if (folders.length > 0) output += '\n'
    }
  }
  
  // Add folders
  folders.forEach((folder, idx) => {
    output += `${indent}📁 ${folder.name}/\n`
    
    // Add files in this folder
    if (folder.files.length > 0) {
      folder.files.forEach(file => {
        output += `${indent}  📄 ${file.name} (${file.type}, ${formatBytes(file.size_bytes)})\n`
      })
    }
    
    // Add subfolders recursively
    if (folder.subfolders.length > 0) {
      output += formatFileSystemForPrompt(folder.subfolders, [], level + 1)
    }
    
    // Add spacing between root folders
    if (level === 0 && idx < folders.length - 1) {
      output += '\n'
    }
  })
  
  return output
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { message, patientId, sessionId, patientName, researchModeEnabled } = body

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Get or create chat session
    let session: any = null
    if (sessionId) {
      let sessionQuery = supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
      
      if (patientId) {
        sessionQuery = sessionQuery.eq("patient_context_id", patientId)
      } else {
        sessionQuery = sessionQuery.is("patient_context_id", null)
      }
      
      const { data: existingSession } = await sessionQuery.single()
      
      session = existingSession
    }

    if (!session) {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          agent_type: "finder",
          patient_context_id: patientId || null,
          title: message.substring(0, 100),
        } as any)
        .select()
        .single()

      if (sessionError) {
        throw sessionError
      }

      session = newSession
    }

    // Get conversation history
    const { data: previousMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })

    const conversationHistory: ChatMessage[] = (previousMessages || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add current user message
    conversationHistory.push({
      role: "user",
      content: message,
    })

    // Save user message to database
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: message,
    } as any)

    // Get patient information (only if patientId is provided)
    let patient = null
    if (patientId) {
      const { data: patientData } = await supabase
        .from("patients")
        .select("age, gender, blood_type, date_of_birth, allergies, current_medications, medical_history")
        .eq("id", patientId)
        .eq("user_id", user.id)
        .single()
      patient = patientData
    }

    // Get all folders for the patient to build hierarchical structure
    let foldersQuery = supabase
      .from("folders")
      .select("id, name, slug, parent_id, created_at")
      .eq("user_id", user.id)
    
    if (patientId) {
      foldersQuery = foldersQuery.eq("patient_id", patientId)
    } else {
      foldersQuery = foldersQuery.is("patient_id", null)
    }
    
    const { data: allFolders } = await foldersQuery.order("name", { ascending: true })

    // Get all files for the patient
    let filesQuery = supabase
      .from("files")
      .select("id, name, type, mime_type, size_bytes, created_at, folder_id")
      .eq("user_id", user.id)
    
    if (patientId) {
      filesQuery = filesQuery.eq("patient_id", patientId)
    } else {
      filesQuery = filesQuery.is("patient_id", null)
    }
    
    const { data: allFiles } = await filesQuery.order("created_at", { ascending: false })

    // Build hierarchical file system structure
    const fileSystemStructure = buildFileSystemTree(allFolders || [], allFiles || [])
    const fileSystemDescription = formatFileSystemForPrompt(fileSystemStructure, allFiles || [])

    // Get AI response
    const { response, citations, error } = await chatWithAgent(
      conversationHistory,
      patientId,
      user.id,
      patientName,
      patient || undefined,
      allFiles || undefined,
      researchModeEnabled || false,
      fileSystemDescription
    )

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Save assistant message to database
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: response,
      citations: citations ? JSON.stringify(citations) : null,
    } as any)

    return NextResponse.json({
      message: response,
      sessionId: session.id,
      citations,
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const patientId = searchParams.get("patientId")

    // Get all chat sessions for this patient or vault (null patientId)
    let sessionsQuery = supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
    
    if (patientId) {
      sessionsQuery = sessionsQuery.eq("patient_context_id", patientId)
    } else {
      sessionsQuery = sessionsQuery.is("patient_context_id", null)
    }

    const { data: sessions, error } = await sessionsQuery.order("updated_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error("Get sessions error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

