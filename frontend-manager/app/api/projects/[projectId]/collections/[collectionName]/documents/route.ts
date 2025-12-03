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
 * Get documents from a collection
 * GET /api/projects/[projectId]/collections/[collectionName]/documents
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : 1;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;
    const countOnly = searchParams.get("count") === "true";

    // Parse filter parameters
    let filter: Record<string, unknown> | undefined = undefined;
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter[")) {
        if (!filter) filter = {};
        const fieldName = key.slice(7, -1); // Remove "filter[" and "]"
        filter[fieldName] = value;
      }
    }

    // Use SDK method - frontend should work like third-party app
    const sdk = await createAuthenticatedBackendSdk(authToken);

    // If count only is requested, use SDK to get documents and count them
    // Note: SDK may not have a direct count method, so we'll get all and count
    if (countOnly) {
      // For count, we can get documents with a high limit and count them
      // Or use SDK if it has a count method
      const documents = await sdk.documents.getAll(projectId, collectionName, {
        filter: filter as Record<string, unknown> | undefined,
        limit: 10000, // High limit to get all for counting
        offset: 0,
      });
      const count = Array.isArray(documents) ? documents.length : 1;
      return NextResponse.json({ success: true, count });
    }

    // Regular document fetching with SDK
    const documents = await sdk.documents.getAll(projectId, collectionName, {
      filter: filter as Record<string, unknown> | undefined,
      limit,
      offset: offset || ((page - 1) * limit),
    });

    // SDK returns documents array directly
    return NextResponse.json({ 
      success: true, 
      data: Array.isArray(documents) ? documents : [documents] 
    });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch documents",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new document in a collection
 * POST /api/projects/[projectId]/collections/[collectionName]/documents
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

    const documentData = await request.json();
    

    if (!documentData.data) {
      
      return NextResponse.json(
        { success: false, error: "Document data is required" },
        { status: 400 }
      );
    }

    // Use SDK method - frontend should work like third-party app
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const document = await sdk.documents.create(
      projectId,
      collectionName,
      { data: documentData.data || documentData }
    );

    // SDK returns document directly
    return NextResponse.json(
      { success: true, ...document },
      { status: 201 }
    );
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create document",
      },
      { status: 500 }
    );
  }
}
