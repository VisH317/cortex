# Embeddings System Documentation

## Overview

The embeddings system generates vector representations of files and website content to enable semantic search and AI-powered features. It uses OpenAI's `text-embedding-3-large` model (1536 dimensions) and stores embeddings in a PostgreSQL database with the pgvector extension.

## Architecture

### Components

1. **Text Chunking Utilities** (`src/lib/utils/text-chunking.ts`)
   - Smart chunking strategies for different content types
   - Maintains semantic boundaries (paragraphs, code blocks, etc.)
   - Configurable token limits with overlap for context preservation

2. **OpenAI Embeddings Service** (`src/lib/services/embeddings.ts`)
   - Wrapper around OpenAI embeddings API
   - Batch processing support (up to 100 items per batch)
   - Token counting and cost tracking

3. **File Embeddings Service** (`src/lib/services/file-embeddings.ts`)
   - File-type-specific embedding generation
   - Folder path metadata encoding
   - Status tracking (pending → processing → completed/failed)

4. **API Route** (`src/app/api/embeddings/generate/route.ts`)
   - RESTful endpoint for triggering embedding generation
   - Authentication and authorization checks
   - Background job coordination

## Supported File Types

### ✅ Fully Implemented

#### Text Files
- **Content Types**: Plain text, markdown, HTML
- **Chunking Strategy**: Token-based with paragraph boundaries
- **Max Chunk Size**: 500 tokens (~2000 characters)
- **Overlap**: 50 tokens for context preservation
- **Metadata Includes**: 
  - File name and type
  - Folder path (e.g., "projects/research/papers")
  - Folder ID
  - Content type

#### Code Files
- **Supported Languages**: JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, etc.
- **Chunking Strategy**: Logical block detection (functions, classes)
- **Fallback**: Line-based chunking with smart break points
- **Max Chunk Size**: 500 tokens
- **Metadata Includes**:
  - Programming language
  - Line numbers (start/end)
  - Folder path and ID
  - File name

#### Website Shortcuts
- **Content Extraction**: HTML parsing with tag removal
- **Chunking Strategy**: Token-based text chunking
- **Max Chunk Size**: 500 tokens
- **Metadata Includes**:
  - Website title and URL
  - Favicon URL
  - Folder path and ID
  - Hostname

#### PDF Files
- **Content Extraction**: Full text extraction using pdf-parse library
- **Chunking Strategy**: Token-based text chunking (same as text files)
- **Max Chunk Size**: 500 tokens
- **Metadata Includes**:
  - File name and folder path
  - Total page count
  - PDF metadata (title, author, subject, creator)
  - Folder path and ID
- **Features**: Extracts all text content from PDF, including metadata from PDF info dictionary

### 🔜 Placeholder (Not Yet Implemented)

#### Images
- **Planned Approach**: GPT-4 Vision or CLIP model
- **Will Include**: Image descriptions, OCR text, visual features
- **Status**: Placeholder function created

#### Audio Files
- **Planned Approach**: Whisper API for transcription → text embeddings
- **Will Include**: Transcribed text, speaker information, timestamps
- **Status**: Placeholder function created

#### Video Files
- **Planned Approach**: Frame sampling + Whisper API for audio track
- **Will Include**: Visual scene descriptions, transcribed audio, timestamps
- **Status**: Placeholder function created

## Folder Path Metadata

### Why It Matters

Folder paths are encoded in the embedding metadata to provide **spatial context** for the AI:
- Helps the AI understand document organization
- Enables folder-scoped searches (e.g., "find papers about ML in the /research folder")
- Improves relevance ranking by considering document location
- Supports hierarchical navigation in AI responses

### Format

```typescript
{
  folder_path: "projects/research/papers",  // Human-readable path
  folder_id: "uuid-of-parent-folder",       // Direct parent reference
  // ... other metadata
}
```

### Path Construction

The system recursively traverses the folder hierarchy from the file's immediate parent to the root, building a path like:
- Root level: `"root"`
- Single folder: `"projects"`
- Nested: `"projects/research/papers"`

## Chunking Strategies

### Text Chunking (`chunkByTokens`)
- Splits on paragraph boundaries (`\n\n`)
- Maintains semantic units
- Overlaps chunks by 50 tokens
- Falls back to sentence splitting for large paragraphs

### Code Chunking (`chunkCode`)
- Detects logical blocks (functions, classes)
- Breaks at closing braces, semicolons, or empty lines
- Preserves code structure
- Includes line number ranges in metadata

### Markdown Chunking (`chunkMarkdown`)
- Splits by headers (`#`, `##`, etc.)
- Preserves document structure
- Falls back to text chunking if no headers found

### HTML Chunking
- Removes `<script>` and `<style>` tags
- Strips HTML tags
- Decodes HTML entities
- Applies text chunking to extracted content

## Workflow

### 1. File Upload
```
User uploads file
  ↓
FileUploadModal saves to Supabase Storage + DB
  ↓
Triggers POST /api/embeddings/generate with fileId
  ↓
generateTextFileEmbeddings() processes file
  ↓
Chunks content → generates embeddings → stores in DB
  ↓
Updates file.embedding_status to "completed"
```

### 2. Website Addition
```
User adds website URL
  ↓
WebsiteShortcutModal saves to DB
  ↓
Triggers POST /api/embeddings/generate with websiteId
  ↓
generateWebsiteEmbeddings() fetches and processes URL
  ↓
Extracts text → chunks → generates embeddings → stores in DB
  ↓
Updates website.embedding_status to "completed"
```

## Database Schema

### Embeddings Table

```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  website_id UUID REFERENCES website_shortcuts(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536) NOT NULL,  -- pgvector type
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sample Metadata

**Text/Code File:**
```json
{
  "file_name": "research_notes.md",
  "file_type": "document",
  "mime_type": "text/markdown",
  "folder_path": "projects/research",
  "folder_id": "abc-123-def",
  "content_type": "markdown",
  "type": "markdown"
}
```

**PDF File:**
```json
{
  "file_name": "research_paper.pdf",
  "file_type": "document",
  "mime_type": "application/pdf",
  "folder_path": "projects/research/papers",
  "folder_id": "abc-123-def",
  "content_type": "pdf",
  "total_pages": 15,
  "pdf_info": {
    "title": "Deep Learning for Researchers",
    "author": "Jane Doe",
    "subject": "Machine Learning",
    "creator": "LaTeX with hyperref"
  }
}
```

## Usage Example

### Generating Embeddings

**For a text file:**
```typescript
await fetch("/api/embeddings/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fileId: "file-uuid" })
})
```

**For a website:**
```typescript
await fetch("/api/embeddings/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ websiteId: "website-uuid" })
})
```

### Response
```json
{
  "success": true,
  "chunkCount": 12,
  "totalTokens": 4567
}
```

## Error Handling

### File Processing Errors
- Status set to `"failed"` in the database
- Error logged to console
- Client receives error message via API response

### Network Errors (Website Fetching)
- Retries not implemented (yet)
- Falls back gracefully
- Status set to `"failed"`

### OpenAI API Errors
- Rate limiting handled by batch processing
- Errors propagated to caller
- Partial failures possible in batch operations

## Cost Considerations

### OpenAI Pricing (text-embedding-3-large)
- Approximately $0.13 per 1M tokens
- Average text file (5KB): ~1,250 tokens = $0.0001625
- Average PDF (10 pages, 5000 words): ~6,250 tokens = $0.0008125
- 10,000 mixed files: ~$2-5 (depending on file sizes)

### Optimization Strategies
- Batch processing (up to 100 items per API call)
- Selective embedding (only text/code files initially)
- Token counting for cost tracking
- Caching (not yet implemented)

## Future Enhancements

1. **Media File Support**
   - Implement image embeddings with GPT-4 Vision
   - Add Whisper API integration for audio/video transcription
   - OCR for scanned PDFs (currently only text PDFs are supported)

2. **Incremental Updates**
   - Re-embed only changed files
   - Version tracking for embeddings

3. **Embedding Updates**
   - Regenerate embeddings when files move between folders
   - Update folder paths in metadata

4. **Search Optimization**
   - Implement semantic search using pgvector's similarity functions
   - Add hybrid search (keyword + semantic)
   - Relevance scoring with folder path weighting

5. **Background Jobs**
   - Queue system for large batch operations
   - Progress tracking UI
   - Scheduled re-embedding for stale content

## Testing

### Manual Testing Steps

1. **Upload a text/code/PDF file**
   - Check `files` table: `embedding_status` should be "pending" → "processing" → "completed"
   - Check `embeddings` table: Should have multiple rows for the file
   - Verify `metadata.folder_path` is correct
   - For PDFs: Verify `metadata.total_pages` and `metadata.pdf_info` fields

2. **Add a website**
   - Check `website_shortcuts` table: `embedding_status` should update
   - Check `embeddings` table: Should have chunks with website content
   - Verify URL and title in metadata

3. **Check logs**
   - Browser console: Look for embedding generation triggers
   - Server logs: Verify OpenAI API calls and chunk counts

### Query Example

```sql
-- Find all embeddings for a specific file
SELECT 
  e.chunk_index,
  e.content_chunk,
  e.metadata->>'folder_path' as folder_path,
  f.name as file_name
FROM embeddings e
JOIN files f ON e.file_id = f.id
WHERE f.id = 'your-file-id'
ORDER BY e.chunk_index;
```

## Environment Variables

Required in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Reference

### POST /api/embeddings/generate

**Request Body:**
```typescript
{
  fileId?: string     // UUID of the file
  websiteId?: string  // UUID of the website (mutually exclusive with fileId)
}
```

**Response:**
```typescript
{
  success: boolean
  chunkCount: number
  totalTokens: number
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (no valid session)
- `400`: Bad request (missing or invalid parameters)
- `500`: Server error (processing failed)

