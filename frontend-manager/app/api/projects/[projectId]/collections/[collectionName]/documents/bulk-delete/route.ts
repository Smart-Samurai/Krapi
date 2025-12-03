import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
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

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // SDK bulkDelete uses filter, but route receives document_ids array
    // We need to delete each document individually or create a filter
    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // For now, delete documents one by one
    // Note: SDK should support array of IDs for bulk delete
    let deletedCount = 0;
    for (const documentId of document_ids) {
      try {
        await sdk.documents.delete(projectId, collectionName, documentId);
        deletedCount++;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to delete document ${documentId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: { deleted: deletedCount },
    });
  } catch (error) {
    
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
