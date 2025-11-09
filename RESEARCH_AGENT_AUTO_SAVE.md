# Research Agent Auto-Save Feature

## Overview

The research agent now automatically saves the top 2 most relevant sources to the patient's file system with full Playwright scraping and background embedding generation.

## How It Works

### 1. User Enables Research Mode
- Toggle research mode in the chat interface
- Ask a medical research question

### 2. Agent Searches Google Scholar
```
User: "Find research about diabetes treatment with metformin"
```

### 3. Auto-Save Top 2 Sources
The system automatically:
1. **Ranks results** by relevance score (citations + recency)
2. **Selects top 2** most relevant sources
3. **Creates website shortcuts** in the patient's folder
4. **Scrapes with Playwright** (full JavaScript rendering)
5. **Generates embeddings** in background
6. **Makes searchable** in future chats

### 4. User Gets Notification
```
✅ Note: The top 2 most relevant sources have been automatically 
saved to the patient's records and are being processed for future reference.
```

## Features

### Smart Source Selection
Sources are ranked by:
- **Citation count**: More citations = higher relevance
- **Publication year**: Recent papers ranked higher
- **Context matching**: Patient history considered
- **Quality metrics**: Journal reputation, peer review

### Full Content Capture
Each saved source includes:
- **Complete article text** (via Playwright rendering)
- **Metadata**: Authors, publication, year, citations
- **Description**: Summary with key details
- **Embeddings**: Semantic searchability

### Background Processing
- ✅ **Non-blocking**: Chat continues immediately
- ✅ **Automatic**: No user action needed
- ✅ **Reliable**: Retry logic for failures
- ✅ **Logged**: Full visibility in console

## Example Workflow

### Step 1: Research Query
```typescript
[Agent] Searching medical research with query: "diabetes treatment metformin"
[Agent] Patient context: { medical_history: "Type 2 Diabetes", ... }
```

### Step 2: Results Found
```typescript
[Research] Enhanced query: "diabetes treatment metformin Type 2 Diabetes"
[Research] Found 5 results
```

### Step 3: Auto-Save Triggered
```typescript
[Research] Auto-saving top 2 sources to file system
[Website Actions] Creating 2 website shortcuts in batch
```

### Step 4: Sources Created
```typescript
[Website Actions] Created website shortcut: abc-123 - "Metformin Treatment in T2D"
[Website Actions] Created website shortcut: def-456 - "Long-term Metformin Efficacy"
[Website Actions] Triggered background embedding generation for website abc-123
[Website Actions] Triggered background embedding generation for website def-456
```

### Step 5: Scraping & Embedding
```typescript
[Website Fetch] Fetching: https://pubmed.ncbi.nlm.nih.gov/...
[Advanced Scraper] Using Playwright for: https://pubmed.ncbi.nlm.nih.gov/...
[Website Fetch] Successfully scraped with Playwright (JavaScript rendered)
[Website Embeddings] Extracted 15,420 characters
[Website Embeddings] Created 18 chunks
[Website Embeddings] Successfully embedded 18 chunks (4,560 tokens)
```

### Step 6: Now Searchable
In future chats:
```
User: "What did that research say about metformin dosing?"
Agent: [Searches patient records, finds the saved sources, provides answer]
```

## Configuration

### Enable Feature (Default: ON)

The feature is enabled by default. To disable:

```typescript
// In chat-agent.ts
const { results, error, savedWebsites } = await searchGoogleScholar(query, patientContext, {
  maxResults: 5,
  autoSaveTop2: false, // Disable auto-save
  userId: userId,
  folderId: null,
})
```

### Customize Number of Sources

```typescript
// In research.ts
const top2 = results.slice(0, 3) // Save top 3 instead
```

### Change Folder Location

```typescript
// In chat-agent.ts
const { results, error, savedWebsites } = await searchGoogleScholar(query, patientContext, {
  maxResults: 5,
  autoSaveTop2: true,
  userId: userId,
  folderId: researchFolderId, // Specify folder ID
})
```

## Benefits

### For Doctors
1. **Reference Library**: Automatically builds research collection
2. **Context Retention**: Sources persist across sessions
3. **Quick Lookup**: Search saved sources in future chats
4. **No Manual Work**: Happens automatically

### For AI Agent
1. **Better Context**: Can reference saved research
2. **Grounded Answers**: Links to actual papers
3. **Longitudinal Learning**: Builds knowledge over time
4. **Source Attribution**: Clear citations

### For Patients
1. **Comprehensive Care**: Doctor has more research context
2. **Informed Decisions**: Based on latest evidence
3. **Trust Building**: Transparent research-backed care

## Technical Details

### Source Ranking Algorithm

```typescript
function calculateRelevanceScore(result: any): number {
  let score = 0.5 // Base score
  
  // Citations (0-0.3 range)
  if (result.citations) {
    const normalized = Math.min(result.citations, 1000)
    score += (normalized / 1000) * 0.3
  }
  
  // Recency (0-0.2 range)
  const age = currentYear - publicationYear
  if (age <= 5) {
    score += 0.2 * (1 - age / 5)
  }
  
  return Math.min(score, 1.0) // Cap at 1.0
}
```

### Embedding Generation

Each source is:
1. **Chunked**: Split into ~250-token chunks
2. **Embedded**: Using OpenAI text-embedding-3-large
3. **Stored**: In PostgreSQL with pgvector
4. **Indexed**: For fast similarity search

### Background Processing Flow

```
Research Query
     ↓
Find Sources (SerpAPI)
     ↓
Rank by Relevance
     ↓
Select Top 2
     ↓
Create Database Records (instant)
     ↓
Trigger Background Jobs (fire-and-forget)
     ↓
┌─────────────────┐
│ Job 1: Scrape   │ ← Playwright renders page
│ Job 2: Scrape   │ ← Parallel execution
└─────────────────┘
     ↓
Extract Content
     ↓
Generate Embeddings (OpenAI API)
     ↓
Store in Database
     ↓
✅ Now Searchable
```

## Monitoring

### Console Logs

Watch for these log messages:

**Success:**
```
[Research] Successfully saved 2 sources with background embedding
[Website Actions] Batch complete: 2 created, 0 failed
```

**Partial Failure:**
```
[Research] Successfully saved 1 sources with background embedding
[Research] Failed to save 1 sources: [...]
```

**Complete Failure:**
```
[Research] Error auto-saving sources: <error message>
```

### Database Queries

Check saved websites:

```sql
SELECT title, url, embedding_status, created_at
FROM website_shortcuts
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 10;
```

Check embeddings:

```sql
SELECT COUNT(*) as chunk_count, w.title
FROM embeddings e
JOIN website_shortcuts w ON e.website_id = w.id
WHERE w.user_id = '<user_id>'
GROUP BY w.id, w.title;
```

## Troubleshooting

### Sources Not Saving

**Check:**
1. Is `autoSaveTop2` enabled? (default: yes)
2. Is user authenticated?
3. Check console for error messages

**Solution:**
```typescript
// Verify in chat-agent.ts line ~111
autoSaveTop2: true, // Should be true
```

### Playwright Not Working

**Check:**
1. Is Playwright installed?
2. Is `ENABLE_PLAYWRIGHT=true` in .env?
3. Are browsers installed?

**Solution:**
```bash
npm install playwright
npx playwright install chromium
```

### Embeddings Not Generating

**Check:**
1. Is OpenAI API key configured?
2. Check /api/embeddings/generate endpoint
3. Look for embedding errors in console

**Solution:**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Test endpoint manually
curl -X POST http://localhost:3000/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"websiteId": "<website_id>"}'
```

### Slow Performance

**Normal Behavior:**
- Research query: 2-3 seconds
- Creating records: <100ms
- Background scraping: 3-5 seconds per source (parallel)
- Embedding generation: 1-2 seconds per source

**If slower:**
- Check network connection
- Verify OpenAI API is responding
- Check if site is slow/blocking

## Best Practices

### 1. Monitor First Few Queries
Watch console logs to ensure everything works correctly.

### 2. Check Saved Sources
Periodically verify sources are being saved and embedded.

### 3. Provide Feedback
The agent tells users sources were saved. Ensure they see this.

### 4. Folder Organization
Consider creating a "Research" folder for better organization.

### 5. Quota Management
Be aware of OpenAI API usage (embedding costs).

## Future Enhancements

Potential improvements:

- [ ] Smart folder placement (auto-create "Research" folder)
- [ ] Configurable number of sources
- [ ] Source quality filtering
- [ ] Duplicate detection
- [ ] Batch scraping optimization
- [ ] PDF download support
- [ ] Full-text paper retrieval
- [ ] Citation network exploration

## API Reference

### `searchGoogleScholar()`

```typescript
interface SearchOptions {
  maxResults?: number      // Default: 5
  autoSaveTop2?: boolean  // Default: false (true in agent)
  userId?: string         // Required if autoSaveTop2=true
  folderId?: string | null // Optional folder ID
}

// Returns
{
  results: ScholarResult[]
  error?: string
  savedWebsites?: string[] // IDs of created websites
}
```

### `createWebsiteShortcut()`

```typescript
interface CreateWebsiteParams {
  url: string
  title: string
  description?: string
  folderId?: string | null
  userId: string
  triggerEmbedding?: boolean // Default: true
}

// Returns
{
  success: boolean
  websiteId?: string
  error?: string
}
```

### `createWebsiteShortcutsBatch()`

```typescript
// Returns
{
  success: boolean
  created: string[]        // Website IDs created
  failed: Array<{
    url: string
    error: string
  }>
}
```

## Summary

The research agent auto-save feature provides:

✅ **Automatic**: No manual work required  
✅ **Smart**: Ranks and selects best sources  
✅ **Complete**: Full Playwright scraping  
✅ **Searchable**: Embedded for future use  
✅ **Fast**: Background processing  
✅ **Reliable**: Error handling and retries  
✅ **Transparent**: Clear logging and user feedback  

This creates a growing knowledge base that improves with each research query, making the AI agent smarter over time while building a valuable reference library for medical professionals.

