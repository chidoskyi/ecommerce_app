// utils/slugify.ts - Fixed version with null/undefined handling
export function slugify(text: string | null | undefined): string {
  // Handle null, undefined, or empty values
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()                           // Convert to string (redundant now, but safe)
    .toLowerCase()                        // Convert to lowercase
    .trim()                               // Trim whitespace
    .replace(/\s+/g, '-')                 // Replace spaces with -
    .replace(/[^\w\-]+/g, '')             // Remove all non-word chars
    .replace(/\-\-+/g, '-')               // Replace multiple - with single -
    .replace(/^-+/, '')                   // Trim - from start of text
    .replace(/-+$/, '');                  // Trim - from end of text
}