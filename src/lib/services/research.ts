/**
 * Medical Research Service
 * Uses SerpAPI to search Google Scholar for scholarly articles
 */

import { getJson } from "serpapi"

export interface ScholarResult {
  title: string
  link: string
  snippet: string
  authors?: string
  publication?: string
  year?: string
  cited_by?: number
  relevance_score?: number
}

export interface PatientContext {
  medical_history?: string | null
  current_medications?: string | null
  allergies?: string | null
}

/**
 * Extract medical context keywords from patient data
 */
function extractContextKeywords(patientContext: PatientContext): string[] {
  const keywords: string[] = []
  
  // Extract conditions from medical history
  if (patientContext.medical_history) {
    // Simple extraction - in production, you might use NLP
    const history = patientContext.medical_history.toLowerCase()
    const commonConditions = [
      'diabetes', 'hypertension', 'asthma', 'copd', 'cancer',
      'heart disease', 'kidney disease', 'liver disease',
      'depression', 'anxiety', 'arthritis', 'obesity'
    ]
    commonConditions.forEach(condition => {
      if (history.includes(condition)) {
        keywords.push(condition)
      }
    })
  }
  
  // Extract medication names (generic names)
  if (patientContext.current_medications) {
    const meds = patientContext.current_medications
      .toLowerCase()
      .split(/[,;]/)
      .map(m => m.trim())
      .filter(m => m.length > 0)
    keywords.push(...meds)
  }
  
  // Add allergies for contraindication checking
  if (patientContext.allergies) {
    const allergies = patientContext.allergies
      .toLowerCase()
      .split(/[,;]/)
      .map(a => a.trim())
      .filter(a => a.length > 0)
    keywords.push(...allergies.map(a => `${a} allergy`))
  }
  
  return keywords
}

/**
 * Enhance search query with patient context
 */
function enhanceQuery(baseQuery: string, patientContext?: PatientContext): string {
  if (!patientContext) {
    return baseQuery
  }
  
  const contextKeywords = extractContextKeywords(patientContext)
  
  if (contextKeywords.length === 0) {
    return baseQuery
  }
  
  // Add top 2-3 most relevant context keywords to avoid over-constraining
  const relevantKeywords = contextKeywords.slice(0, 3).join(' ')
  
  return `${baseQuery} ${relevantKeywords}`
}

/**
 * Calculate relevance score based on citation count and other factors
 */
function calculateRelevanceScore(result: any): number {
  let score = 0.5 // Base score
  
  // Higher score for more citations (normalize to 0-0.3 range)
  if (result.inline_links?.cited_by?.total) {
    const citations = Math.min(result.inline_links.cited_by.total, 1000)
    score += (citations / 1000) * 0.3
  }
  
  // Higher score for recent publications (0-0.2 range)
  if (result.publication_info?.summary) {
    const yearMatch = result.publication_info.summary.match(/(\d{4})/)
    if (yearMatch) {
      const year = parseInt(yearMatch[1])
      const currentYear = new Date().getFullYear()
      const age = currentYear - year
      if (age <= 5) {
        score += 0.2 * (1 - age / 5) // More recent = higher score
      }
    }
  }
  
  return Math.min(score, 1.0)
}

/**
 * Search Google Scholar for medical research
 */
export async function searchGoogleScholar(
  query: string,
  patientContext?: PatientContext,
  options: {
    maxResults?: number
  } = {}
): Promise<{ results: ScholarResult[]; error?: string }> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY
    
    if (!apiKey) {
      console.error('[Research] SERPAPI_API_KEY not configured')
      return {
        results: [],
        error: 'Research service not configured. Please contact administrator.'
      }
    }
    
    // Enhance query with patient context
    const enhancedQuery = enhanceQuery(query, patientContext)
    
    console.log(`[Research] Original query: "${query}"`)
    console.log(`[Research] Enhanced query: "${enhancedQuery}"`)
    
    // Call SerpAPI Google Scholar endpoint
    const response = await getJson({
      engine: "google_scholar",
      q: enhancedQuery,
      api_key: apiKey,
      num: options.maxResults || 5, // Limit to 5 results by default
    })
    
    if (response.error) {
      console.error('[Research] SerpAPI error:', response.error)
      return {
        results: [],
        error: 'Failed to fetch research results. Please try again.'
      }
    }
    
    const organicResults = response.organic_results || []
    
    console.log(`[Research] Found ${organicResults.length} results`)
    
    // Format results
    const results: ScholarResult[] = organicResults.map((result: any) => {
      const relevanceScore = calculateRelevanceScore(result)
      
      return {
        title: result.title || 'Untitled',
        link: result.link || '',
        snippet: result.snippet || 'No description available',
        authors: result.publication_info?.authors?.map((a: any) => a.name).join(', '),
        publication: result.publication_info?.summary || '',
        year: result.publication_info?.summary?.match(/(\d{4})/)?.[1],
        cited_by: result.inline_links?.cited_by?.total,
        relevance_score: relevanceScore,
      }
    })
    
    // Sort by relevance score
    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    
    return { results }
  } catch (error: any) {
    console.error('[Research] Error searching Google Scholar:', error)
    return {
      results: [],
      error: `Research service error: ${error.message || 'Unknown error'}`
    }
  }
}

/**
 * Format research results for the AI agent
 */
export function formatResearchResultsForAgent(results: ScholarResult[]): string {
  if (results.length === 0) {
    return 'No research papers found for this query. Try rephrasing or using more specific medical terms.'
  }
  
  let formatted = `Found ${results.length} relevant research articles:\n\n`
  
  results.forEach((result, index) => {
    const relevancePercent = ((result.relevance_score || 0.5) * 100).toFixed(0)
    const citedBy = result.cited_by ? ` (Cited by ${result.cited_by})` : ''
    
    formatted += `[${index + 1}] ${result.title}\n`
    formatted += `Authors: ${result.authors || 'Unknown'}\n`
    formatted += `Publication: ${result.publication || 'Not specified'}\n`
    formatted += `Relevance: ${relevancePercent}%${citedBy}\n`
    formatted += `Summary: ${result.snippet}\n`
    formatted += `Link: ${result.link}\n\n`
  })
  
  formatted += 'Note: These are scholarly research articles. Please verify findings and consider the patient\'s specific circumstances before making clinical decisions.'
  
  return formatted
}

