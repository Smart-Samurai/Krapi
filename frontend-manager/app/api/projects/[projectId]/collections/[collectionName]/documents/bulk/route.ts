import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Bulk operations for documents
 * POST /api/projects/[projectId]/collections/[collectionName]/documents/bulk
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; collectionName: string }> }
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

    const { projectId, collectionName } = await params;

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName) {
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    const requestData = await request.json();
    const { documents } = requestData;

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { success: false, error: "Documents array is required" },
        { status: 400 }
      );
    }

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const bulkUrl = `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/bulk`;

    const response = await fetch(bulkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to create documents",
        },
        { status: response.status }
      );
    }

    const backendResponse = await response.json();
    // Backend returns { success: true, created: [...], errors: [], total: ... }
    // Test expects response.data.created to be an array
    // Return the backend response directly, not wrapped in data
    return NextResponse.json(backendResponse, { status: 201 });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create documents",
      },
      { status: 500 }
    );
  }
}

/**
 * Bulk update documents
 * PUT /api/projects/[projectId]/collections/[collectionName]/documents/bulk
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; collectionName: string }> }
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

    const { projectId, collectionName } = await params;

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName) {
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    const requestData = await request.json();
    const { updates } = requestData;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Updates array is required" },
        { status: 400 }
      );
    }

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const bulkUrl = `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/bulk`;

    const response = await fetch(bulkUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to update documents",
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update documents",
      },
      { status: 500 }
    );
  }
}
