import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Documents
 * 
 * GET /api/client/krapi/k1/projects/[projectId]/collections/[collectionName]/documents - Get documents
 * POST /api/client/krapi/k1/projects/[projectId]/collections/[collectionName]/documents - Create document
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const countOnly = searchParams.get("count") === "true";

    let filter: Record<string, unknown> | undefined = undefined;
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter[")) {
        if (!filter) filter = {};
        const fieldName = key.slice(7, -1);
        filter[fieldName] = value;
      }
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);

    if (countOnly) {
      const count = await clientSdk.documents.count(projectId, collectionName, filter);
      return NextResponse.json({
        success: true,
        data: { count },
      });
    }

    const documents = await clientSdk.documents.getAll(projectId, collectionName, {
      limit,
      offset,
      filter,
    });

    return NextResponse.json({
      success: true,
      data: Array.isArray(documents) ? documents : [documents],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch documents",
      },
      { status: 500 }
    );
  }
}

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
    const documentData = await request.json();

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

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const document = await clientSdk.documents.create(projectId, collectionName, documentData);

    return NextResponse.json({
      success: true,
      data: document,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create document",
      },
      { status: 500 }
    );
  }
}

