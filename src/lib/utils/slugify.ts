/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
}

/**
 * Generate a unique slug by appending a number if needed
 */
export function generateUniqueSlug(baseName: string, existingSlugs: string[]): string {
  let slug = slugify(baseName)
  let counter = 1
  
  while (existingSlugs.includes(slug)) {
    slug = `${slugify(baseName)}-${counter}`
    counter++
  }
  
  return slug
}

/**
 * Parse a slug path into array of slugs
 * Example: "folder1/folder2/folder3" => ["folder1", "folder2", "folder3"]
 */
export function parseSlugPath(slugPath: string): string[] {
  return slugPath.split('/').filter(Boolean)
}

/**
 * Build full path from slug array
 * Example: ["folder1", "folder2"] => "folder1/folder2"
 */
export function buildSlugPath(slugs: string[]): string {
  return slugs.filter(Boolean).join('/')
}

