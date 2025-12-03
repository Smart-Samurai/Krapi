import { NextRequest } from "next/server";

import { handleCreateProject } from "./handlers/create-project.handler";
import { handleGetProjects } from "./handlers/get-projects.handler";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Projects API Route (SDK-compatible path)
 *
 * GET /api/krapi/k1/projects - Get all projects
 * POST /api/krapi/k1/projects - Create a new project
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 *
 * Handlers are separated into individual files for better organization and debugging.
 */

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetProjects(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateProject(request);
}
