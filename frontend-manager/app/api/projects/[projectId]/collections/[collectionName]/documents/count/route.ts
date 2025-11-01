/**
 * Count Documents API Route
 * GET /api/projects/[projectId]/collections/[collectionName]/documents/count
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    let filter: Record<string, string> | undefined = undefined;
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter[")) {
        if (!filter) filter = {};
        const fieldName = key.slice(7, -1); // Remove "filter[" and "]"
        filter[fieldName] = value;
      }
    }

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

    // Build query parameters for filtering
    const countParams = new URLSearchParams();
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (typeof value === "string") {
          countParams.append(`filter[${key}]`, value);
        }
      }
    }

    const fullCountUrl = countParams.toString()
      ? `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/count?${countParams.toString()}`
      : `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/count`;

    const response = await fetch(fullCountUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to count documents",
        },
        { status: response.status }
      );
    }

    const countData = await response.json();
    return NextResponse.json({ success: true, data: countData });
  } catch (error) {
    console.error("Error counting documents:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to count documents",
      },
      { status: 500 }
    );
  }
}
