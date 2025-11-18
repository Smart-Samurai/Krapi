import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get a specific collection by name
 * GET /api/projects/[projectId]/collections/[collectionName]
 */
export async function GET(
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

    // Call the backend directly since the SDK method is not implemented for server mode
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}`,
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
          error: errorData.error || "Failed to fetch collection",
        },
        { status: response.status }
      );
    }

    const backendResponse = await response.json();
    
    // Wrap response to match expected format: { success: true, collection: ... }
    const collection = backendResponse.collection || backendResponse.data || backendResponse;
    
    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch collection",
      },
      { status: 500 }
    );
  }
}

/**
 * Update a collection
 * PUT /api/projects/[projectId]/collections/[collectionName]
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
    const collectionData = await request.json();

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

    // Call the backend directly since the SDK method is not implemented for server mode
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}`,
      {
        method: "PUT",
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
          error: errorData.error || "Failed to update collection",
        },
        { status: response.status }
      );
    }

    const backendResponse = await response.json();
    
    // Wrap response to match expected format: { success: true, collection: ... }
    const collection = backendResponse.collection || backendResponse.data || backendResponse;
    
    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update collection",
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a collection
 * DELETE /api/projects/[projectId]/collections/[collectionName]
 */
export async function DELETE(
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

    // Call the backend directly since the SDK method is not implemented for server mode
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const response = await fetch(
      `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}`,
      {
        method: "DELETE",
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
          error: errorData.error || "Failed to delete collection",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Collection deleted successfully",
    });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete collection",
      },
      { status: 500 }
    );
  }
}
