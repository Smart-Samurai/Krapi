import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Bulk delete documents in a collection
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/bulk-delete
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; collectionName: string }>;
  }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId, collectionName } = await params;

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

    const body = await request.json();
    const documentIds = body.document_ids as string[] | undefined;

    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { success: false, error: "Document IDs array is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // The SDK's bulkDelete calls httpClient.bulkDeleteDocuments which makes POST to backend
    // Backend handler returns { success: true, data: { deleted_count, errors } }
    // SDK's bulkDelete returns response.data || { deleted_count: 0, errors: [] }
    // So we need to return the backend response as-is for the SDK to extract response.data
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.documents.bulkDelete(projectId, collectionName, documentIds);
    
    // SDK adapter's bulkDelete already extracted response.data, so result is { deleted_count, errors }
    // Frontend route should return it wrapped in data for SDK HTTP client compatibility
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[BULK DELETE] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to bulk delete documents";
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("[BULK DELETE] Error stack:", error.stack);
      if ("status" in error) {
        console.error("[BULK DELETE] HTTP status:", (error as { status?: number }).status);
      }
      if ("response" in error) {
        console.error("[BULK DELETE] Response:", (error as { response?: unknown }).response);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}



