/**
 * Utility functions for collection handlers
 */

/**
 * Sanitize project ID while preserving UUID format (with dashes)
 * 
 * Preserves UUID format (with dashes) for valid UUIDs, otherwise
 * sanitizes non-UUID project IDs by removing invalid characters.
 * 
 * @param {string} projectId - Project ID to sanitize
 * @returns {string} Sanitized project ID
 */
export function sanitizeProjectId(projectId: string): string {
  // Preserve UUID format (with dashes) - only sanitize non-UUID IDs
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(projectId)
    ? projectId // Keep UUIDs as-is (with dashes)
    : projectId.replace(/[^a-zA-Z0-9_-]/g, ""); // For non-UUIDs, allow dashes and underscores
}

/**
 * Extract project ID from request params or URL
 */
export function extractProjectId(req: { params?: { projectId?: string }; originalUrl?: string }): string | null {
  let projectId = req.params?.projectId;

  // If projectId is not in params, extract it from the URL path
  if (!projectId && req.originalUrl) {
    const urlParts = req.originalUrl.split("/");
    const projectIndex = urlParts.findIndex((part) => part === "projects");
    if (projectIndex !== -1 && projectIndex + 1 < urlParts.length) {
      projectId = urlParts[projectIndex + 1];
    }
  }

  return projectId || null;
}








