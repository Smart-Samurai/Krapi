/**
 * Aggregate Documents API Route
 * POST /api/projects/[projectId]/collections/[collectionName]/documents/aggregate
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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

    // Call the backend directly
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";
    // Backend route is /aggregate not /documents/aggregate
    const aggregateUrl = `${backendUrl}/krapi/k1/projects/${projectId}/collections/${collectionName}/aggregate`;

    const response = await fetch(aggregateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to aggregate documents",
        },
        { status: response.status }
      );
    }

    const backendResponse = await response.json();
    // Backend returns { success: true, groups: [...], ... }
    // Return it directly
    return NextResponse.json(backendResponse);
  } catch (error: unknown) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to aggregate documents",
      },
      { status: 500 }
    );
  }
}

