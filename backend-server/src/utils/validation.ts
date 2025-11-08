/**
 * Validation Utilities
 * 
 * Provides validation functions for common data types used in KRAPI.
 * 
 * @module utils/validation
 */

/**
 * Validates if a string is a valid UUID format
 * 
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if valid UUID format, false otherwise
 * 
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUUID('invalid'); // false
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") {
    return false;
  }

  // More lenient UUID validation - accept any valid UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates if a string is a valid project ID
 * 
 * Project IDs can be UUIDs or other formats.
 * For UUIDs, validates UUID format. For other formats, checks non-empty string.
 * 
 * @param {string} id - The string to validate
 * @returns {boolean} True if valid project ID format, false otherwise
 * 
 * @example
 * isValidProjectId('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidProjectId('my-project'); // true
 * isValidProjectId(''); // false
 */
export function isValidProjectId(id: string): boolean {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return false;
  }

  const trimmedId = id.trim();

  // If it looks like a UUID (contains dashes and is 36 chars), validate UUID format
  if (trimmedId.includes("-") && trimmedId.length === 36) {
    return isValidUUID(trimmedId);
  }

  // For non-UUID formats, just check if it's a non-empty string
  return trimmedId.length > 0;
}

/**
 * Sanitizes a project ID by trimming whitespace
 * 
 * @param {string} id - The project ID to sanitize
 * @returns {string | null} The sanitized project ID or null if invalid
 * 
 * @example
 * sanitizeProjectId('  project-id  '); // 'project-id'
 * sanitizeProjectId(''); // null
 */
export function sanitizeProjectId(id: string): string | null {
  if (!id || typeof id !== "string") {
    return null;
  }

  const trimmedId = id.trim();

  if (trimmedId === "") {
    return null;
  }

  return trimmedId;
}
