import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Bulk delete documents
 * POST /api/projects/[projectId]/collections/[collectionName]/documents/bulk-delete
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
    const { document_ids } = requestData;

    if (!document_ids || !Array.isArray(document_ids)) {
      return NextResponse.json(
        { success: false, error: "document_ids array is required" },
        { status: 400 }
      );
    }

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    const bulkDeleteUrl = `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/bulk-delete`;

    const response = await fetch(bulkDeleteUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ document_ids }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to bulk delete documents",
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk delete documents",
      },
      { status: 500 }
    );
  }
}
