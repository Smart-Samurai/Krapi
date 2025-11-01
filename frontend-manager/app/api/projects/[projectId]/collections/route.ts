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
    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/collections`,
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
          error: errorData.error || "Failed to fetch collections",
        },
        { status: response.status }
      );
    }

    const collections = await response.json();
    // Return collections array directly from the backend response
    return NextResponse.json({ data: collections.collections });
  } catch (error) {
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
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to create collection",
        },
        { status: response.status }
      );
    }

    const collection = await response.json();
    console.log("🔍 [FRONTEND COLLECTIONS] Backend response:", collection);
    console.log(
      "🔍 [FRONTEND COLLECTIONS] Returning collection:",
      collection.collection
    );
    // Return the collection data wrapped in success/data structure
    return NextResponse.json(
      { success: true, data: collection.collection },
      { status: 201 }
    );
  } catch (error) {
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
