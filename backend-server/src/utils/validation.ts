/**
 * Validation utilities for the KRAPI backend
 */

/**
 * Validates if a string is a valid UUID format
 * @param uuid - The string to validate
 * @returns true if valid UUID format, false otherwise
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
 * Project IDs can be UUIDs or other formats
 * @param id - The string to validate
 * @returns true if valid project ID format, false otherwise
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
 * @param id - The project ID to sanitize
 * @returns The sanitized project ID or null if invalid
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
