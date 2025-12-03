import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Bulk update documents in a collection
 * PUT /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/bulk
 */
export async function PUT(
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
    const updates = body.updates as Array<{ id: string; data: Record<string, unknown> }> | undefined;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Updates array is required" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.documents.bulkUpdate(projectId, collectionName, updates);

    // SDK adapter expects response.data to be the bulk update result
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to bulk update documents";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Bulk create documents in a collection
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/bulk
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
    const documents = body.documents as Array<{ data: Record<string, unknown> }> | undefined;

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { success: false, error: "Documents array is required" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.documents.bulkCreate(projectId, collectionName, documents);

    // SDK adapter expects response.data to be the bulk create result
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to bulk create documents";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

