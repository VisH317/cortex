/**
 * Advanced Web Scraping Utilities
 * 
 * This module provides advanced web scraping capabilities including:
 * - JavaScript rendering with Playwright (optional)
 * - Readability-based content extraction
 * - Fallback strategies for difficult sites
 * 
 * SETUP REQUIRED:
 * To enable Playwright for JavaScript rendering:
 * 1. Install: npm install playwright
 * 2. Install browsers: npx playwright install chromium
 * 3. Set ENABLE_PLAYWRIGHT=true in your .env
 * 
 * For serverless: npm install playwright-aws-lambda
 */

// Optional Playwright import (will be undefined if not installed)
let playwright: any
try {
  playwright = require('playwright')
} catch {
  // Playwright not installed, will use fallback methods
}

export interface ScrapedContent {
  html: string
  text: string
  title?: string
  description?: string
  author?: string
  publishedDate?: string
  readingTime?: number
  isPuppeteerUsed: boolean
}

/**
 * Readability-based text extraction
 * Extracts the main content area from HTML, filtering out navigation, ads, etc.
 */
function extractMainContent(html: string): string {
  // Look for main content containers
  const mainContainerPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*(?:class|id)="[^"]*(?:content|main|article|post|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]
  
  for (const pattern of mainContainerPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const contentLength = match[1].replace(/<[^>]+>/g, "").trim().length
      // If we found a substantial content area, use it
      if (contentLength > 300) {
        return match[1]
      }
    }
  }
  
  // Fallback: return the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return bodyMatch?.[1] || html
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(html: string): {
  title?: string
  description?: string
  author?: string
  publishedDate?: string
} {
  const metadata: any = {}
  
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch?.[1]) {
    metadata.title = titleMatch[1].trim()
  }
  
  // Meta description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                    html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
  if (descMatch?.[1]) {
    metadata.description = descMatch[1].trim()
  }
  
  // Author
  const authorMatch = html.match(/<meta\s+name="author"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+property="article:author"\s+content="([^"]+)"/i)
  if (authorMatch?.[1]) {
    metadata.author = authorMatch[1].trim()
  }
  
  // Published date
  const dateMatch = html.match(/<meta\s+property="article:published_time"\s+content="([^"]+)"/i) ||
                    html.match(/<meta\s+name="date"\s+content="([^"]+)"/i) ||
                    html.match(/<time[^>]*datetime="([^"]+)"/i)
  if (dateMatch?.[1]) {
    metadata.publishedDate = dateMatch[1].trim()
  }
  
  return metadata
}

/**
 * Scrape website with Playwright (requires Playwright to be installed)
 */
async function scrapeWithPlaywright(url: string): Promise<string> {
  if (!playwright) {
    throw new Error('Playwright is not installed. Run: npm install playwright && npx playwright install chromium')
  }
  
  console.log(`[Advanced Scraper] Using Playwright for: ${url}`)
  
  let browser
  try {
    // Launch Chromium browser
    browser = await playwright.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    
    const page = await context.newPage()
    
    // Navigate to page with timeout
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })
    
    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(2000)
    
    // Get the fully rendered HTML
    const html = await page.content()
    
    await browser.close()
    return html
  } catch (error: any) {
    if (browser) {
      await browser.close()
    }
    throw new Error(`Playwright scraping failed: ${error.message}`)
  }
}

/**
 * Standard fetch with enhanced headers
 */
async function scrapeWithFetch(url: string): Promise<string> {
  console.log(`[Advanced Scraper] Using standard fetch for: ${url}`)
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    },
    redirect: 'follow',
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return await response.text()
}

/**
 * Detect if a website is likely to need JavaScript rendering
 */
function needsJavaScriptRendering(html: string, extractedTextLength: number): boolean {
  // If we got very little text, it might be an SPA
  if (extractedTextLength < 200) {
    return true
  }
  
  // Check for SPA indicators
  const spaIndicators = [
    /<div id="root"><\/div>/,
    /<div id="app"><\/div>/,
    /This app works best with JavaScript enabled/i,
    /You need to enable JavaScript to run this app/i,
  ]
  
  return spaIndicators.some(pattern => pattern.test(html))
}

/**
 * Advanced web scraper with automatic fallback strategy
 * 
 * @param url - The URL to scrape
 * @param options - Scraping options
 * @returns ScrapedContent with HTML, extracted text, and metadata
 */
export async function advancedWebScraper(
  url: string,
  options: {
    forcePlaywright?: boolean
    timeout?: number
    retries?: number
  } = {}
): Promise<ScrapedContent> {
  const {
    forcePlaywright = false,
    timeout = 30000,
    retries = 2,
  } = options
  
  const enablePlaywright = process.env.ENABLE_PLAYWRIGHT === 'true' || forcePlaywright
  
  let html: string
  let isPlaywrightUsed = false
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Strategy 1: Try standard fetch first (unless Playwright is forced)
      if (!forcePlaywright) {
        html = await scrapeWithFetch(url)
        
        // Extract a sample to check if we need JavaScript
        const mainContent = extractMainContent(html)
        const sampleText = mainContent.replace(/<[^>]+>/g, " ").trim()
        
        if (!needsJavaScriptRendering(html, sampleText.length)) {
          // Standard fetch worked fine
          const metadata = extractMetadata(html)
          
          return {
            html,
            text: sampleText,
            isPuppeteerUsed: false,
            ...metadata,
          }
        }
        
        // If we detect SPA but Playwright is not available/enabled
        if (!enablePlaywright || !playwright) {
          console.warn(`[Advanced Scraper] SPA detected but Playwright is not available. Content may be incomplete.`)
          const metadata = extractMetadata(html)
          
          return {
            html,
            text: sampleText,
            isPuppeteerUsed: false,
            ...metadata,
          }
        }
      }
      
      // Strategy 2: Use Playwright for JavaScript rendering
      if (enablePlaywright && playwright) {
        html = await scrapeWithPlaywright(url)
        isPlaywrightUsed = true
        
        const mainContent = extractMainContent(html)
        const text = mainContent.replace(/<[^>]+>/g, " ").trim()
        const metadata = extractMetadata(html)
        
        return {
          html,
          text,
          isPuppeteerUsed: isPlaywrightUsed, // Keep name for backwards compatibility
          ...metadata,
        }
      }
      
      // This shouldn't be reached but just in case
      throw new Error('No scraping strategy succeeded')
      
    } catch (error: any) {
      lastError = error
      console.error(`[Advanced Scraper] Attempt ${attempt + 1} failed:`, error.message)
      
      if (attempt < retries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  
  throw new Error(`Failed to scrape ${url} after ${retries} attempts: ${lastError?.message}`)
}

/**
 * Check if Playwright is available
 */
export function isPlaywrightAvailable(): boolean {
  return !!playwright && process.env.ENABLE_PLAYWRIGHT === 'true'
}

/**
 * Get scraping capabilities info
 */
export function getScrapingCapabilities() {
  return {
    playwrightInstalled: !!playwright,
    playwrightEnabled: process.env.ENABLE_PLAYWRIGHT === 'true',
    canRenderJavaScript: !!playwright && process.env.ENABLE_PLAYWRIGHT === 'true',
  }
}

