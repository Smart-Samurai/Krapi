import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Document by ID
 * 
 * GET /api/client/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/[documentId] - Get document
 * PUT /api/client/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/[documentId] - Update document
 * DELETE /api/client/krapi/k1/projects/[projectId]/collections/[collectionName]/documents/[documentId] - Delete document
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
    params: Promise<{
      projectId: string;
      collectionName: string;
      documentId: string;
    }>;
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

    const { projectId, collectionName, documentId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName || !documentId) {
      return NextResponse.json(
        { success: false, error: "Collection name and document ID are required" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const document = await clientSdk.documents.get(projectId, collectionName, documentId);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: "Document not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch document",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      collectionName: string;
      documentId: string;
    }>;
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

    const { projectId, collectionName, documentId } = await params;
    const updates = await request.json();

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName || !documentId) {
      return NextResponse.json(
        { success: false, error: "Collection name and document ID are required" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const document = await clientSdk.documents.update(projectId, collectionName, documentId, updates);

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update document",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      collectionName: string;
      documentId: string;
    }>;
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

    const { projectId, collectionName, documentId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!collectionName || !documentId) {
      return NextResponse.json(
        { success: false, error: "Collection name and document ID are required" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    await clientSdk.documents.delete(projectId, collectionName, documentId);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete document",
      },
      { status: 500 }
    );
  }
}










