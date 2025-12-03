/**
 * Search Documents API Route
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/search
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

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
 * Search documents in a collection
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/search
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

    const searchOptions = await request.json();

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const results = await sdk.documents.search(projectId, collectionName, {
      text: searchOptions.query || searchOptions.text || "",
      filters: searchOptions.filter || searchOptions.filters,
      limit: searchOptions.limit || 50,
      offset: searchOptions.offset || 0,
    });

    return NextResponse.json({
      success: true,
      data: Array.isArray(results) ? results : [results],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search documents",
      },
      { status: 500 }
    );
  }
}



