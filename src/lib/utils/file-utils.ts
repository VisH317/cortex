import type { FileType } from "@/types/database.types"

/**
 * File type mapping based on MIME types and extensions
 */
const FILE_TYPE_MAP: Record<string, FileType> = {
  // Text/Code files
  "text/plain": "document",
  "text/markdown": "document",
  "text/html": "document",
  "text/css": "code",
  "text/javascript": "code",
  "text/typescript": "code",
  "application/javascript": "code",
  "application/typescript": "code",
  "application/json": "code",
  "application/xml": "code",
  "text/xml": "code",
  
  // Documents
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel": "dataset",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "dataset",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
  
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  
  // Audio
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  
  // Video
  "video/mp4": "video",
  "video/webm": "video",
  "video/ogg": "video",
  "video/quicktime": "video",
  
  // Data files
  "text/csv": "dataset",
  "application/vnd.sqlite3": "dataset",
}

const CODE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "hpp",
  "cs", "go", "rs", "rb", "php", "swift", "kt", "scala", "r",
  "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
  "sql", "graphql", "yml", "yaml", "toml", "ini", "conf",
  "dockerfile", "makefile", "cmake", "gradle",
])

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst", "tex", "log", "csv",
])

/**
 * Classify file type based on MIME type and filename
 */
export function classifyFileType(mimeType: string, filename: string): FileType {
  // Check MIME type mapping first
  if (FILE_TYPE_MAP[mimeType]) {
    return FILE_TYPE_MAP[mimeType]
  }

  // Check file extension
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext) {
    if (CODE_EXTENSIONS.has(ext)) return "code"
    if (TEXT_EXTENSIONS.has(ext)) return "document"
  }

  // Default to document for text-based MIME types
  if (mimeType.startsWith("text/")) {
    return "document"
  }

  // Default to other
  return "other"
}

/**
 * Check if file type is supported for text/code upload
 */
export function isTextOrCodeFile(mimeType: string, filename: string): boolean {
  const type = classifyFileType(mimeType, filename)
  return type === "document" || type === "code"
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string, filename: string): boolean {
  const type = classifyFileType(mimeType, filename)
  return type === "image"
}

/**
 * Check if file is audio
 */
export function isAudioFile(mimeType: string, filename: string): boolean {
  const type = classifyFileType(mimeType, filename)
  return type === "audio"
}

/**
 * Check if file is video
 */
export function isVideoFile(mimeType: string, filename: string): boolean {
  const type = classifyFileType(mimeType, filename)
  return type === "video"
}

/**
 * Check if file is any supported media type
 */
export function isSupportedMediaFile(mimeType: string, filename: string): boolean {
  const type = classifyFileType(mimeType, filename)
  return ["image", "audio", "video"].includes(type)
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

/**
 * Check if file is a code file (for syntax highlighting)
 */
export function isCodeFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return CODE_EXTENSIONS.has(ext)
}

/**
 * Get language for syntax highlighting based on file extension
 */
export function getLanguageFromExtension(filename: string): string {
  const ext = getFileExtension(filename)
  
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    sql: "sql",
    graphql: "graphql",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    md: "markdown",
    markdown: "markdown",
  }
  
  return languageMap[ext] || "plaintext"
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Validate file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  
  if (file.size > maxSize) {
    return { valid: false, error: "File size exceeds 50MB limit" }
  }
  
  if (!file.name || file.name.trim() === "") {
    return { valid: false, error: "Invalid file name" }
  }
  
  return { valid: true }
}

