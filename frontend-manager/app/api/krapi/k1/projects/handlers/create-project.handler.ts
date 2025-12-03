import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Create Project Handler
 *
 * Handles POST /api/krapi/k1/projects - Create a new project
 *
 * Separated from route file for better organization and debugging.
 * This is where we suspect the "Project ID is required" error might be coming from.
 */
export async function handleCreateProject(
  request: NextRequest
): Promise<Response> {
  try {
    console.log("🔍 [FRONTEND CREATE PROJECT] Request received", {
      url: request.url,
      method: request.method,
      headers: {
        authorization: request.headers.get("authorization")
          ? "present"
          : "missing",
        "x-project-id": request.headers.get("x-project-id") || "not present",
      },
    });

    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      console.log("❌ [FRONTEND CREATE PROJECT] No auth token");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectData = await request.json();

    if (
      !projectData.name ||
      typeof projectData.name !== "string" ||
      projectData.name.trim().length === 0
    ) {
      console.log("❌ [FRONTEND CREATE PROJECT] Invalid project name");
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    console.log(
      "🔍 [FRONTEND CREATE PROJECT] Creating authenticated backend SDK"
    );
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK projects.create method
    console.log(
      "🔍 [FRONTEND CREATE PROJECT] Calling backendSdk.projects.create()",
      {
        projectName: projectData.name,
        hasDescription: !!projectData.description,
        hasSettings: !!projectData.settings,
      }
    );

    const project = await backendSdk.projects.create({
      name: projectData.name.trim(),
      description: projectData.description?.trim(),
      settings: projectData.settings,
    });

    console.log("✅ [FRONTEND CREATE PROJECT] Success", {
      projectId: project?.id,
      projectName: project?.name,
    });

    // Return response in SDK-compatible format
    return NextResponse.json(
      {
        success: true,
        data: project,
        project, // Also include for backward compatibility
      },
      { status: 201 } // 201 Created
    );
  } catch (error) {
    // SDK errors are properly formatted
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create project";
    const statusCode = (error as { status?: number })?.status || 500;

    console.error("❌ [FRONTEND CREATE PROJECT] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
