import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedSdk, getAuthToken } from "@/app/api/lib/sdk-client";

// Disable static generation for this dynamic route
export function generateStaticParams() {
  return [];
}

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get a specific project
 * GET /api/projects/[projectId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Call the backend directly to properly handle 404 responses
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const backendEndpoint = `${backendUrl}/krapi/k1/projects/${projectId}`;
    
    let response;
    try {
      response = await fetch(backendEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error("Failed to connect to backend:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to connect to backend server" },
        { status: 503 }
      );
    }

    if (!response.ok) {
      interface ErrorData {
        error?: string;
        message?: string;
      }

      let errorData: ErrorData;
      try {
        const errorText = await response.text();
        try {
          errorData = JSON.parse(errorText) as ErrorData;
        } catch {
          errorData = { error: errorText || `Backend returned ${response.status}` };
        }
      } catch {
        errorData = { error: `Backend returned ${response.status}` };
      }
      // eslint-disable-next-line no-console
      console.error(`Backend error for project ${projectId}:`, errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || errorData.message || "Failed to fetch project" },
        { status: response.status }
      );
    }

    let backendResponse;
    try {
      backendResponse = await response.json();
    } catch (_parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON response from backend" },
        { status: 500 }
      );
    }

    // Check if the response has the expected structure
    if (!backendResponse || typeof backendResponse !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid response format from backend" },
        { status: 500 }
      );
    }

    // Backend returns { success: true, data: project } or project directly
    const projectData = backendResponse.data || backendResponse;
    
    if (!projectData || !projectData.id) {
      return NextResponse.json(
        { success: false, error: "Backend response missing project data" },
        { status: 500 }
      );
    }

    // Wrap response to match expected format: { success: true, project: ... }
    return NextResponse.json({
      success: true,
      project: projectData,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching project:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get project",
      },
      { status: 500 }
    );
  }
}

/**
 * Update a project
 * PUT /api/projects/[projectId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const updates = await request.json();

    // Validate UUID format before making SDK call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Normalize active/is_active fields - backend expects is_active
    const normalizedUpdates: Record<string, unknown> = { ...updates };
    if ("active" in normalizedUpdates && !("is_active" in normalizedUpdates)) {
      normalizedUpdates.is_active = normalizedUpdates.active;
      delete normalizedUpdates.active;
    }

    // Create authenticated SDK instance using the session token
    const authenticatedSdk = await createAuthenticatedSdk(authToken);

    const project = await authenticatedSdk.projects.update(projectId, normalizedUpdates);
    
    // Wrap response to match expected format: { success: true, project: ... }
    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update project",
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a project
 * DELETE /api/projects/[projectId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    // Validate UUID format before making SDK call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Create authenticated SDK instance using the session token
    const authenticatedSdk = await createAuthenticatedSdk(authToken);

    await authenticatedSdk.projects.delete(projectId);
    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete project",
      },
      { status: 500 }
    );
  }
}
