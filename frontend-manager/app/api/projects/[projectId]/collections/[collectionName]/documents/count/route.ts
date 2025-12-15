import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function generateStaticParams() {
  return [];
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Count documents in a collection
 * GET /api/projects/[projectId]/collections/[collectionName]/documents/count
 */
export async function GET(
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

    const { searchParams } = new URL(request.url);
    let filter: Record<string, unknown> | undefined = undefined;
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter[")) {
        if (!filter) filter = {};
        const fieldName = key.slice(7, -1);
        filter[fieldName] = value;
      }
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK count method if available, otherwise get all and count
    if (typeof sdk.documents.count === "function") {
      const count = await sdk.documents.count(projectId, collectionName, {
        filter: filter as Record<string, unknown> | undefined,
      });
      return NextResponse.json({ success: true, count });
    }

    // Fallback: get all documents and count them
    const documents = await sdk.documents.getAll(projectId, collectionName, {
      filter: filter as Record<string, unknown> | undefined,
      limit: 10000,
      offset: 0,
    });
    const count = Array.isArray(documents) ? documents.length : 1;
    return NextResponse.json({ success: true, count });
  } catch (error) {
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
