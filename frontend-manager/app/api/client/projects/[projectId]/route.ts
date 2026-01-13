import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Project by ID (Legacy /api/projects/[projectId])
 * 
 * GET /api/client/projects/[projectId] - Get project
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const project = await clientSdk.projects.get(projectId);

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: `Project '${projectId}' not found`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...project,
      project,
      data: project,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get project";
    
    // Check for permission errors
    if (
      errorMessage.toLowerCase().includes("insufficient permissions") ||
      errorMessage.toLowerCase().includes("permission denied") ||
      errorMessage.toLowerCase().includes("forbidden") ||
      (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 403) ||
      (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "FORBIDDEN")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}








