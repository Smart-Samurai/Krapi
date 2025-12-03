/**
 * Aggregate Documents API Route
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/aggregate
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
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

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // Use backend SDK aggregateDocuments method if available
    const documentsService = sdk as unknown as {
      aggregateDocuments: (
        projectId: string,
        collectionName: string,
        pipeline: unknown[]
      ) => Promise<unknown[]>;
    };
    
    // Convert request format to backend pipeline format
    const groupBy = requestData.group_by || requestData.groupBy || [];
    const aggregations = requestData.aggregations || [];
    
    // Build aggregation pipeline
    const pipeline = [
      {
        $group: {
          _id: groupBy.reduce(
            (acc: Record<string, unknown>, field: string) => ({
              ...acc,
              [field]: `$${field}`,
            }),
            {}
          ),
          count: { $sum: 1 },
        },
      },
      ...aggregations,
    ];
    
    const result = await documentsService.aggregateDocuments(
      projectId,
      collectionName,
      pipeline
    );

    return NextResponse.json({
      success: true,
      groups: Array.isArray(result) ? result : [],
      total_groups: Array.isArray(result) ? result.length : 0,
      aggregations: aggregations || [],
    });
  } catch (error) {
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



