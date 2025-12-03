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
 * Get documents from a collection
 * GET /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents
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

    let filter: Record<string, unknown> | undefined = undefined;
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("filter[")) {
        if (!filter) filter = {};
        const fieldName = key.slice(7, -1);
        filter[fieldName] = value;
      }
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);

    if (countOnly) {
      const documents = await sdk.documents.getAll(projectId, collectionName, {
        filter: filter as Record<string, unknown> | undefined,
        limit: 10000,
        offset: 0,
      });
      const count = Array.isArray(documents) ? documents.length : 1;
      return NextResponse.json({ success: true, count });
    }

    const documents = await sdk.documents.getAll(projectId, collectionName, {
      filter: filter as Record<string, unknown> | undefined,
      limit,
      offset: offset || (page - 1) * limit,
    });

    return NextResponse.json({
      success: true,
      data: Array.isArray(documents) ? documents : [documents],
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
 * POST /api/krapi/k1/projects/[projectId]/collections/[collectionName]/documents
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

    const documentData = await request.json();

    if (!documentData.data) {
      return NextResponse.json(
        { success: false, error: "Document data is required" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const document = await sdk.documents.create(projectId, collectionName, {
      data: documentData.data || documentData,
    });

    return NextResponse.json({ success: true, ...document }, { status: 201 });
  } catch (error) {
    // Return actual error message for better debugging
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create document";
    const statusCode =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : 500;

    // eslint-disable-next-line no-console
    console.error("Error creating document:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}

