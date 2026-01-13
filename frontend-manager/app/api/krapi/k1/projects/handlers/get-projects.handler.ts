import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/* eslint-disable no-console */

/**
 * Get Projects Handler
 *
 * Handles GET /api/krapi/k1/projects - Get all projects
 *
 * Separated from route file for better organization and debugging.
 */
export async function handleGetProjects(
  request: NextRequest
): Promise<Response> {
  try {
    console.log("🔍 [FRONTEND GET PROJECTS] Request received", {
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
      console.log("❌ [FRONTEND GET PROJECTS] No auth token");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    console.log(
      "🔍 [FRONTEND GET PROJECTS] Creating authenticated backend SDK"
    );
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK projects.getAll method
    console.log(
      "🔍 [FRONTEND GET PROJECTS] Calling backendSdk.projects.getAll()"
    );
    const projects = await backendSdk.projects.getAll();

    console.log("✅ [FRONTEND GET PROJECTS] Success", {
      projectsCount: Array.isArray(projects) ? projects.length : "not array",
    });

    // Return response in SDK-compatible format
    const projectsArray = Array.isArray(projects) ? projects : [];
    return NextResponse.json({
      success: true,
      data: projectsArray,
      projects: projectsArray, // Also include for backward compatibility
    });
  } catch (error) {
    // SDK errors are properly formatted
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get projects";
    const statusCode = (error as { status?: number })?.status || 500;

    console.error("❌ [FRONTEND GET PROJECTS] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
