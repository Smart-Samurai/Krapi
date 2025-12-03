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

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const created = await sdk.documents.bulkCreate(projectId, collectionName, documents);

    // SDK returns array of created documents
    // Format response to match backend format
    return NextResponse.json({
      success: true,
      created: Array.isArray(created) ? created : [created],
      errors: [],
      total: Array.isArray(created) ? created.length : 1,
    }, { status: 201 });
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

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // Note: SDK bulkUpdate uses filter and updates, but route receives array of updates
    // We need to handle this - for now, update each document individually or use first update as template
    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // If updates is an array, we need to process each update
    // SDK expects: bulkUpdate(projectId, collectionName, filter, updates)
    // Route receives: { updates: [{ id, data }, ...] }
    // For now, we'll update documents one by one or use a common filter
    // This is a limitation - SDK should support array of updates
    let totalUpdated = 0;
    for (const update of updates) {
      if (update.id && update.data) {
        try {
          await sdk.documents.update(projectId, collectionName, update.id, update.data);
          totalUpdated++;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to update document ${update.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { updated: totalUpdated },
    });
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
