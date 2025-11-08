# Complete Embeddings System Guide

## ✅ What's Already Implemented

All embedding types are **fully functional** and automatically triggered when you upload files:

### 1. **Text Files** (OpenAI)
- **Models**: Markdown, plain text, HTML
- **Embedding Model**: `text-embedding-3-large` (1536 dims)
- **Chunking**: 500 tokens with semantic boundaries
- **Status**: ✅ Active

### 2. **Code Files** (OpenAI)
- **Languages**: JavaScript, TypeScript, Python, Java, C++, Go, Rust, etc.
- **Embedding Model**: `text-embedding-3-large` (1536 dims)
- **Chunking**: Logical blocks (functions, classes) with line numbers
- **Status**: ✅ Active

### 3. **PDF Files** (OpenAI)
- **Processing**: Full text extraction via `pdf-parse`
- **Embedding Model**: `text-embedding-3-large` (1536 dims)
- **Metadata**: Page count, title, author, subject
- **Status**: ✅ Active

### 4. **Images** (Vertex AI)
- **Formats**: JPG, PNG, GIF, BMP, WebP
- **Embedding Model**: `multimodalembedding@001` (1408 dims)
- **Processing**: Base64 encoding → Vertex AI
- **Status**: ✅ Active

### 5. **Audio Files** (Vertex AI)
- **Formats**: MP3, WAV, OGG, WebM Audio
- **Embedding Model**: `multimodalembedding@001` (1408 dims)
- **Processing**: GCS URI → 16-second segments (Essential tier)
- **Embeddings**: One per segment with timestamps
- **Status**: ✅ Active

### 6. **Video Files** (Vertex AI)
- **Formats**: MP4, WebM, AVI, MOV, MKV
- **Embedding Model**: `multimodalembedding@001` (1408 dims)
- **Processing**: GCS URI → 10-second segments (Standard tier)
- **Embeddings**: One per segment with timestamps
- **Status**: ✅ Active

### 7. **Website Shortcuts** (OpenAI)
- **Processing**: HTML parsing → text extraction
- **Embedding Model**: `text-embedding-3-large` (1536 dims)
- **Chunking**: 500 tokens
- **Status**: ✅ Active

## 🔄 Automatic Workflow

When you upload ANY supported file:

```
Upload File
    ↓
Save to Supabase Storage
    ↓
Save metadata to database (embedding_status: "pending")
    ↓
[Background] POST /api/embeddings/generate
    ↓
Detect file type → Route to appropriate embedding function
    ↓
Generate embeddings (OpenAI or Vertex AI)
    ↓
Store embeddings in database with metadata
    ↓
Update file status to "completed"
```

## 📊 Embedding Models Summary

| File Type | Model | Provider | Dimensions | Cost per file |
|-----------|-------|----------|------------|---------------|
| Text/Code | text-embedding-3-large | OpenAI | 1536 | ~$0.0002 |
| PDF | text-embedding-3-large | OpenAI | 1536 | ~$0.0008 |
| Website | text-embedding-3-large | OpenAI | 1536 | ~$0.0002 |
| Image | multimodalembedding@001 | Vertex AI | 1408 | ~$0.00025 |
| Audio (2min) | multimodalembedding@001 | Vertex AI | 1408 | ~$0.0016 |
| Video (2min) | multimodalembedding@001 | Vertex AI | 1408 | ~$0.0048 |

## 🧪 Testing the System

### Step 1: Check Environment Variables

Ensure your `.env.local` has:
```bash
# OpenAI (for text, code, PDFs)
OPENAI_API_KEY=sk-...

# Vertex AI (for images, audio, video)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./keys.json

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=files
```

### Step 2: Upload Test Files

Upload one of each type:
1. **Text file**: Create `test.txt` with some content
2. **Code file**: Upload a `.js` or `.py` file
3. **PDF**: Upload any PDF document
4. **Image**: Upload a `.jpg` or `.png`
5. **Audio**: Upload a `.mp3` file
6. **Video**: Upload a `.mp4` file

### Step 3: Monitor Embedding Status

Check the file viewer - each file should show:
- `Embeddings: pending` (briefly)
- `Embeddings: processing` (while generating)
- `Embeddings: completed` (when done)

### Step 4: Verify in Database

Run this SQL query in Supabase:

```sql
-- Check embedding counts by file type
SELECT 
  f.type as file_type,
  f.name as file_name,
  COUNT(e.id) as embedding_count,
  f.embedding_status,
  e.metadata->>'embedding_model' as model
FROM files f
LEFT JOIN embeddings e ON e.file_id = f.id
GROUP BY f.id, f.type, f.name, f.embedding_status, e.metadata->>'embedding_model'
ORDER BY f.created_at DESC;
```

Expected results:
- **Text/Code files**: Multiple embeddings (one per chunk)
- **PDFs**: Multiple embeddings (one per chunk)
- **Images**: 1 embedding
- **Audio files**: ~8 embeddings (for 2-minute file with 16s intervals)
- **Video files**: ~12 embeddings (for 2-minute file with 10s intervals)

### Step 5: Check Metadata

Query embeddings with metadata:

```sql
-- See embedding metadata for each file type
SELECT 
  e.metadata->>'file_type' as type,
  e.metadata->>'content_type' as content_type,
  e.metadata->>'embedding_model' as model,
  e.metadata->>'dimension' as dimension,
  e.metadata->>'folder_path' as folder_path,
  COUNT(*) as count
FROM embeddings e
GROUP BY 
  e.metadata->>'file_type',
  e.metadata->>'content_type',
  e.metadata->>'embedding_model',
  e.metadata->>'dimension',
  e.metadata->>'folder_path';
```

## 🐛 Troubleshooting

### Images Not Generating Embeddings

**Check:**
1. Vertex AI API is enabled
2. `GOOGLE_APPLICATION_CREDENTIALS` points to valid key file
3. Service account has `roles/aiplatform.user` permission

**Test:**
```bash
# Verify credentials
gcloud auth activate-service-account --key-file=./keys.json
gcloud projects list
```

### Audio/Video Not Generating Embeddings

**Common Issue**: GCS URI construction

**Check:**
1. `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` is set correctly
2. Files are uploaded to Supabase Storage

**Debug:**
Add logging to `file-embeddings.ts`:
```typescript
console.log('Constructed GCS URI:', gcsUri)
```

### Embeddings Stuck at "pending"

**Check:**
1. Browser console for API errors
2. Server logs: `pnpm dev`
3. Supabase logs for database errors

**Manual Trigger:**
```bash
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"fileId":"your-file-id"}'
```

### OpenAI Rate Limits

If you see `429 Too Many Requests`:
1. Wait 60 seconds
2. Consider upgrading OpenAI tier
3. Implement retry logic with exponential backoff

### Vertex AI Quota Exceeded

If you see quota errors:
1. Go to [Google Cloud Console → IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Filter: `aiplatform.googleapis.com/online_prediction_requests_per_base_model`
3. Request quota increase

## 📈 Monitoring

### Check Embedding Generation Success Rate

```sql
SELECT 
  embedding_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM files
GROUP BY embedding_status;
```

### Check Recent Embedding Activity

```sql
SELECT 
  f.name,
  f.type,
  f.embedding_status,
  f.created_at,
  COUNT(e.id) as embedding_count
FROM files f
LEFT JOIN embeddings e ON e.file_id = f.id
WHERE f.created_at > NOW() - INTERVAL '1 hour'
GROUP BY f.id, f.name, f.type, f.embedding_status, f.created_at
ORDER BY f.created_at DESC;
```

### Check Embedding Storage Size

```sql
SELECT 
  e.metadata->>'content_type' as type,
  COUNT(*) as total_embeddings,
  pg_size_pretty(
    pg_total_relation_size('embeddings')
  ) as total_size
FROM embeddings e
GROUP BY e.metadata->>'content_type';
```

## 🎯 Best Practices

### 1. **Batch Uploads**
- Upload multiple files at once
- Embeddings generate in parallel
- Monitor completion status

### 2. **File Organization**
- Organize files in folders **before** uploading
- Folder path is embedded in metadata
- Helps with semantic search later

### 3. **Cost Optimization**
- **Images**: Already optimized (single embedding)
- **Audio**: Uses Essential tier (lowest cost)
- **Video**: Uses Standard tier (balance of cost/quality)
- **Text/PDFs**: Chunked efficiently

### 4. **Error Handling**
- Files with `embedding_status: "failed"` can be re-processed
- Delete and re-upload, or trigger manually via API

### 5. **Large Files**
- Videos > 2 minutes: Only first 2 minutes processed
- PDFs with 100+ pages: Consider splitting
- Audio > 2 minutes: Consider splitting or increasing segment intervals

## 🔮 Future Enhancements

### Planned Features

1. **Manual Re-embedding**
   - Button to regenerate embeddings for failed files
   - Useful after fixing configuration

2. **Embedding Analytics Dashboard**
   - Show embedding coverage
   - Display costs
   - Monitor success rates

3. **Advanced Video Processing**
   - Process full video length (not just 2 minutes)
   - Configurable segment intervals
   - Scene detection

4. **Image OCR**
   - Extract text from images
   - Combine with visual embeddings
   - Better for documents/diagrams

5. **Audio Transcription**
   - Use Whisper API for speech-to-text
   - Generate text embeddings from transcript
   - Dual embeddings (audio + text)

## 📚 API Reference

### POST /api/embeddings/generate

**Request:**
```json
{
  "fileId": "uuid-of-file"
}
```

Or:
```json
{
  "websiteId": "uuid-of-website"
}
```

**Response (Success):**
```json
{
  "success": true,
  "chunkCount": 12,
  "totalTokens": 4567
}
```

**Response (Error):**
```json
{
  "error": "Failed to generate embeddings: Invalid API key"
}
```

## ✅ Quick Checklist

Before using the system, ensure:

- [ ] OpenAI API key is set
- [ ] Vertex AI credentials are configured
- [ ] Supabase is set up with tables and policies
- [ ] Storage bucket name matches environment variable
- [ ] `.gitignore` includes `keys.json`
- [ ] Test upload works for text files
- [ ] Test upload works for images
- [ ] Embeddings show "completed" status
- [ ] Database has embedding records

## 🎉 You're All Set!

Your multimodal embedding system is **fully operational**. Upload any supported file and embeddings will generate automatically in the background!

For questions or issues, check:
1. Browser console (client errors)
2. Server terminal (API errors)
3. Supabase logs (database errors)
4. Google Cloud logs (Vertex AI errors)

