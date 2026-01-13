import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Projects (Legacy /api/projects)
 * 
 * GET /api/client/projects - Get all projects
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const projects = await clientSdk.projects.getAll();

    const projectsArray = Array.isArray(projects) ? projects : [];
    return NextResponse.json({
      success: true,
      data: projectsArray,
      projects: projectsArray,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get projects",
      },
      { status: 500 }
    );
  }
}










