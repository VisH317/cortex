# Website Scraping & Embedding Guide

## Overview

The system provides advanced website scraping capabilities to extract and embed content from web pages, including support for JavaScript-rendered Single Page Applications (SPAs).

## Features

### 1. **Improved HTML Text Extraction**
- Semantic HTML understanding (extracts main content, filters out navigation/ads)
- Comprehensive HTML entity decoding
- Metadata extraction (Open Graph, meta descriptions, author info)
- Alt text extraction from images
- Preserves document structure (paragraphs, headings, lists, tables)

### 2. **Smart Content Detection**
- Automatically detects JavaScript-heavy SPAs
- Identifies when content requires JavaScript rendering
- Falls back gracefully when advanced features aren't available

### 3. **Optional JavaScript Rendering**
- Puppeteer integration for rendering dynamic content
- Works with React, Vue, Angular, Next.js, and other SPA frameworks
- Automatic retry logic with exponential backoff

## How It Works

### Standard Scraping (Default)
For static websites, the system uses standard HTTP fetch with enhanced headers:
- Works immediately without additional setup
- Fast and efficient
- Suitable for ~80% of websites

### Advanced Scraping (Optional)
For JavaScript-heavy sites, you can enable Puppeteer:
- Renders JavaScript before extracting content
- Captures dynamically loaded content
- Better metadata extraction

## Setup

### Basic Setup (No Additional Dependencies)
The system works out of the box with improved text extraction for static sites.

### Advanced Setup (JavaScript Rendering)

#### 1. Install Puppeteer

```bash
npm install puppeteer
```

For serverless deployment (Vercel, AWS Lambda), also install:

```bash
npm install puppeteer-core @sparticuz/chromium
```

#### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Enable Puppeteer for JavaScript rendering
ENABLE_PUPPETEER=true

# Optional: Disable advanced scraper entirely (use basic fetch only)
# USE_ADVANCED_SCRAPER=false
```

#### 3. Restart Your Server

```bash
npm run dev
```

### Serverless Deployment Notes

For serverless platforms, you'll need to use a lightweight Chrome binary:

```typescript
// src/lib/utils/advanced-web-scraper.ts
// Modify the Puppeteer launch configuration:

import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

Alternatively, use a hosted service like:
- [Browserless.io](https://browserless.io)
- [ScrapingBee](https://www.scrapingbee.com)
- [Bright Data](https://brightdata.com)

## Usage

### Creating Website Shortcuts

1. Click "Add Website" in any folder
2. Enter the URL
3. The system will automatically:
   - Fetch the website content
   - Detect if it's a SPA
   - Extract text and metadata
   - Generate embeddings for search

### Monitoring

Check the console logs for scraping status:

```
[Website Fetch] Fetching: https://example.com
[Website Fetch] Successfully scraped with Puppeteer (JavaScript rendered)
[Website Embeddings] Extracted 15420 characters from https://example.com
[Website Embeddings] Created 12 chunks
[Website Embeddings] Successfully embedded 12 chunks (3840 tokens)
```

### SPA Detection

If a SPA is detected but Puppeteer isn't enabled:

```
[Website Fetch] SPA detected, content may be incomplete. 
[Website Fetch] Install Puppeteer for JavaScript rendering:
[Website Fetch]   npm install puppeteer
[Website Fetch]   Set ENABLE_PUPPETEER=true in .env
```

## Content Extraction

### What Gets Extracted

✅ **Included:**
- Main article content
- Headings and paragraphs
- Lists and tables
- Image alt text
- Meta descriptions
- Open Graph data
- Author information
- Published dates

❌ **Excluded:**
- Navigation menus
- Headers and footers
- Sidebars
- Advertisements
- Cookie notices
- Popups

### HTML Elements Handling

| Element | Treatment |
|---------|-----------|
| `<article>`, `<main>` | Prioritized for extraction |
| `<nav>`, `<header>`, `<footer>` | Removed |
| `<script>`, `<style>`, `<svg>` | Removed |
| `<p>`, `<h1>`-`<h6>` | Preserved with line breaks |
| `<table>`, `<tr>`, `<td>` | Converted to text with separators |
| `<img alt="...">` | Alt text extracted |

## Troubleshooting

### Issue: "Insufficient content extracted"

**Possible causes:**
1. Site requires JavaScript (SPA)
2. Site is blocking scrapers
3. Site requires authentication
4. Rate limiting

**Solutions:**
1. Enable Puppeteer (see Advanced Setup)
2. Check if the site has a public API
3. Manually save the content as a text file instead

### Issue: "SPA detected but content is incomplete"

**Solution:**
Enable Puppeteer following the Advanced Setup instructions.

### Issue: Puppeteer fails in production

**Solutions:**
1. Use `puppeteer-core` with `@sparticuz/chromium` for serverless
2. Use a hosted browser service (Browserless.io, etc.)
3. Pre-render content before deployment

### Issue: Slow scraping performance

**Solutions:**
1. Most sites use fast standard fetch (< 1s)
2. Puppeteer adds 3-5s overhead for JavaScript rendering
3. Consider caching results in database
4. Use webhook/background processing for bulk operations

## Performance Comparison

| Method | Speed | JavaScript Support | Compatibility |
|--------|-------|-------------------|---------------|
| Standard Fetch | < 1s | ❌ No | ~80% of sites |
| Standard Fetch (Improved) | < 1s | ❌ No | ~85% of sites |
| Puppeteer | 3-5s | ✅ Yes | ~98% of sites |

## API Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_PUPPETEER` | `false` | Enable JavaScript rendering with Puppeteer |
| `USE_ADVANCED_SCRAPER` | `true` | Use advanced scraper with fallbacks |

### Scraping Functions

```typescript
// Check if Puppeteer is available
import { isPuppeteerAvailable, getScrapingCapabilities } from '@/lib/utils/advanced-web-scraper'

const canRenderJS = isPuppeteerAvailable()
// Returns: boolean

const capabilities = getScrapingCapabilities()
// Returns: {
//   puppeteerInstalled: boolean,
//   puppeteerEnabled: boolean,
//   canRenderJavaScript: boolean
// }
```

## Best Practices

1. **Start Without Puppeteer**: Most sites work fine with standard fetch
2. **Monitor Logs**: Check which sites need JavaScript rendering
3. **Enable Selectively**: Only enable Puppeteer if you're scraping many SPAs
4. **Consider Alternatives**: For frequently accessed sites, check if they offer an API
5. **Respect Robots.txt**: Always check if scraping is allowed
6. **Rate Limiting**: Be respectful of server resources

## Examples

### Static Website (News Article)
```
URL: https://example.com/article
Method: Standard Fetch
Time: 0.8s
Content: 12,450 characters
Chunks: 10
✅ Works perfectly without Puppeteer
```

### React SPA (Documentation Site)
```
URL: https://react-docs.example.com
Method: Puppeteer (JavaScript rendered)
Time: 4.2s
Content: 8,920 characters
Chunks: 7
⚠️ Requires Puppeteer for full content
```

### Next.js Site (Blog)
```
URL: https://nextjs-blog.example.com/post
Method: Standard Fetch (SSR/SSG content available)
Time: 1.1s
Content: 15,680 characters
Chunks: 12
✅ Works with standard fetch (Next.js has SSR)
```

## Future Enhancements

Potential improvements for future versions:
- [ ] PDF export of scraped content
- [ ] Automatic screenshot capture
- [ ] Multi-page crawling (follow internal links)
- [ ] Sitemap parsing
- [ ] RSS feed integration
- [ ] Content change detection & re-scraping
- [ ] Custom CSS selectors for specific sites

## Related Documentation

- [Embeddings System](./EMBEDDINGS_SYSTEM.md)
- [RAG Implementation](./EMBEDDINGS_COMPLETE_GUIDE.md)
- [Quick Start Guide](./QUICK_START.md)

