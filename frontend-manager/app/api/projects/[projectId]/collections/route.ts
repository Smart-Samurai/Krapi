import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

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
 * Get all collections for a project
 * GET /api/projects/[projectId]/collections
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
    const backendEndpoint = `${backendUrl}/krapi/k1/projects/${projectId}/collections`;
    
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
      console.error(`Backend error for project ${projectId} collections:`, errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || errorData.message || "Failed to fetch collections",
        },
        { status: response.status }
      );
    }

    let backendResponse;
    try {
      backendResponse = await response.json();
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON response from backend" },
        { status: 500 }
      );
    }
    
    // Wrap response to match expected format: { success: true, collections: [...] }
    // Backend might return { collections: [...] } or { data: [...] } or just an array
    const collectionsArray = backendResponse.collections || backendResponse.data || (Array.isArray(backendResponse) ? backendResponse : []);
    
    return NextResponse.json({
      success: true,
      collections: collectionsArray,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch collections",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new collection for a project
 * POST /api/projects/[projectId]/collections
 */
export async function POST(
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
    const collectionData = await request.json();

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
      `${backendUrl}/krapi/k1/projects/${projectId}/collections`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(collectionData),
      }
    );

    if (!response.ok) {
      let errorData: { error?: string; message?: string };
      try {
        const errorText = await response.text();
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `Backend returned ${response.status}` };
        }
      } catch {
        errorData = { error: `Backend returned ${response.status}` };
      }
      // eslint-disable-next-line no-console
      console.error(`Backend error creating collection for project ${projectId}:`, errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || errorData.message || "Failed to create collection",
        },
        { status: response.status }
      );
    }

    const backendResponse = await response.json();
    // Wrap response to match expected format: { success: true, collection: ... }
    const collection = backendResponse.data || backendResponse.collection || backendResponse;
    return NextResponse.json(
      { success: true, collection },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating collection:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create collection",
      },
      { status: 500 }
    );
  }
}
