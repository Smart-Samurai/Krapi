import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get project settings
 * GET /api/projects/[projectId]/settings
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

    // Call the backend directly since the SDK method is not implemented for server mode
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/settings`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to fetch project settings",
        },
        { status: response.status }
      );
    }

    const settings = await response.json();
    // Extract the data from the backend response and return it directly
    return NextResponse.json(settings.data);
  } catch (error: unknown) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch project settings",
      },
      { status: 500 }
    );
  }
}

/**
 * Update project settings
 * PUT /api/projects/[projectId]/settings
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

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // Call the backend directly since the SDK method is not implemented for server mode
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/settings`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: updates }), // Backend expects settings wrapped
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to update project settings",
        },
        { status: response.status }
      );
    }

    const settings = await response.json();
    // Extract the data from the backend response and return it directly
    return NextResponse.json(settings.data);
  } catch (error: unknown) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update project settings",
      },
      { status: 500 }
    );
  }
}
