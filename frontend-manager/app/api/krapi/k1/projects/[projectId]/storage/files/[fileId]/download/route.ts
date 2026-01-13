/**
 * Download File API Route (SDK path)
 * GET /api/krapi/k1/projects/[projectId]/storage/files/[fileId]/download
 *
 * Proxies to backend storage download to return the file bytes.
 */

export { GET } from "../../../download/[fileId]/route";

// Re-declare route config instead of re-exporting (Next.js requires static analysis)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

