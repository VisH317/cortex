<!-- 026d8ef2-7299-4e2a-8626-9825722a86e8 419a2247-43c1-4f75-93b1-d5157ee5c56a -->
# Research Agent Integration Plan

## Overview

Add research capabilities to the medical chat agent using SerpAPI's Google Scholar integration, with patient-aware query enhancement and a UI toggle for research mode.

## Key Requirements

- Use SerpAPI for Google Scholar searches only
- Return results ephemerally in chat (no storage)
- Format: Brief summary + citation + relevance score
- UI toggle to enable/disable research mode
- Enhance queries with patient conditions/medications
- Keep scope limited to scholarly articles

## Implementation Steps

### 1. Environment & Dependencies

**Files to modify:** `package.json`, `.env.example`

- Install `serpapi` npm package
- Add `SERPAPI_API_KEY` to environment variables
- Document the new env var in `.env.example`

### 2. Create Research Service

**New file:** `src/lib/services/research.ts`

- Implement `searchGoogleScholar()` function
- Accept query + patient context (conditions, medications, allergies)
- Enhance search query with patient context keywords
- Call SerpAPI Google Scholar endpoint
- Parse and format results with:
- Title, authors, journal, year
- Brief summary/snippet
- Citation link
- Relevance score (from SerpAPI or calculated)
- Return structured results array

### 3. Update Chat Agent Service

**File to modify:** `src/lib/services/chat-agent.ts`

- Import the new research service
- Update `handleFunctionCall()` for `search_medical_research`:
- Extract patient context from parameters
- Call `searchGoogleScholar()` with enhanced query
- Format results for agent consumption
- Update `chatWithAgent()` function signature to accept `researchModeEnabled` boolean
- Conditionally include/exclude `search_medical_research` tool in the tools array based on toggle

### 4. Update Chat API Route

**File to modify:** `src/app/api/chat/route.ts`

- Accept `researchModeEnabled` boolean from request body
- Pass it to `chatWithAgent()` function
- No other changes needed (patient context already fetched)

### 5. Add UI Toggle to Chat Component

**File to modify:** `src/components/ChatAgent.tsx`

- Add state: `const [researchModeEnabled, setResearchModeEnabled] = useState(false)`
- Add toggle button in the header area (next to patient name or above input)
- Style toggle with icon (e.g., `GraduationCap` or `Search` icon from lucide-react)
- Include toggle state in API request body
- Add visual indicator when research mode is active

### 6. Testing & Validation

- Test with patient who has known conditions (e.g., diabetes)
- Verify query enhancement works (adds diabetes context)
- Confirm toggle enables/disables research tool
- Check citation formatting in chat responses
- Validate SerpAPI rate limits and error handling

## Files Changed

- `package.json` - Add serpapi dependency
- `.env.example` - Document SERPAPI_API_KEY
- `src/lib/services/research.ts` - New file
- `src/lib/services/chat-agent.ts` - Update tool handling
- `src/app/api/chat/route.ts` - Add research toggle parameter
- `src/components/ChatAgent.tsx` - Add UI toggle

## Example Query Enhancement

- Doctor query: "What are the latest treatments for hypertension?"
- Patient has: diabetes, takes metformin
- Enhanced query: "hypertension treatments diabetes mellitus metformin interactions contraindications"

## Notes

- SerpAPI Google Scholar endpoint: `/search?engine=google_scholar`
- Keep queries focused on medical/clinical research
- Handle rate limits gracefully (SerpAPI has quota limits)
- Error handling: Fall back gracefully if SerpAPI fails

### To-dos

- [ ] Install serpapi package and configure environment variables
- [ ] Create research.ts service with Google Scholar search and patient context enhancement
- [ ] Update chat-agent.ts to handle research tool with conditional enabling and patient context
- [ ] Update chat API route to accept and pass research mode toggle
- [ ] Add research mode toggle button to ChatAgent component UI
- [ ] Test research functionality with patient context and toggle behavior