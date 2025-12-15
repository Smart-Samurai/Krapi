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
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/search
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

    const searchQuery = await request.json();

    const sdk = await createAuthenticatedBackendSdk(authToken);
    // SDK search method expects: search(projectId, collectionName, { text?, fields?, filters?, limit?, offset? })
    // Note: SDK adapter doesn't support 'sort' directly, it uses sort_by and sort_order in options
    const result = await sdk.documents.search(projectId, collectionName, {
      text: searchQuery.query || searchQuery.text,
      fields: searchQuery.fields,
      filters: searchQuery.filters,
      limit: searchQuery.limit,
      offset: searchQuery.offset,
    });

    // SDK adapter expects response.data to be the search results
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to search documents";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
