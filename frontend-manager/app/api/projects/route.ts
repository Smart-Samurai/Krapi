import { NextRequest, NextResponse } from "next/server";

/**
 * Extract auth token from request headers
 */
function getAuthToken(headers: Headers): string | undefined {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.substring(7);
  }
  return undefined;
}

/**
 * Get all projects
 * GET /api/projects
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Call backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(`${backendUrl}/krapi/k1/projects`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Backend request failed: ${response.status} ${response.statusText}`
      );
    }

    const backendResponse = await response.json();

    // Wrap response to match expected format: { success: true, projects: [...] }
    if (backendResponse.success && Array.isArray(backendResponse.data)) {
      return NextResponse.json({
        success: true,
        projects: backendResponse.data,
        pagination: backendResponse.pagination,
      });
    }

    // If backend returns array directly
    if (Array.isArray(backendResponse)) {
      return NextResponse.json({
        success: true,
        projects: backendResponse,
      });
    }

    // Return the backend response as-is if format is different
    return NextResponse.json(backendResponse);
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get projects",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new project
 * POST /api/projects
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Debug: Log all headers received (removed for production)

    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectData = await request.json();

    if (!projectData.name) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    // Call backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(`${backendUrl}/krapi/k1/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description,
        settings: projectData.settings,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Backend request failed: ${response.status} ${response.statusText}`
      );
    }

    const backendResponse = await response.json();

    // Wrap response to match expected format: { success: true, project: ... }
    if (backendResponse.success && backendResponse.data) {
      return NextResponse.json(
        {
          success: true,
          project: backendResponse.data,
        },
        { status: 201 }
      );
    }

    // If backend returns project directly
    if (backendResponse.id) {
      return NextResponse.json(
        {
          success: true,
          project: backendResponse,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(backendResponse, { status: 201 });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
