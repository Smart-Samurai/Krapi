import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Documents API Routes
 *
 * GET /api/documents - Get documents from a collection
 * POST /api/documents - Create a new document
 */

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection_id");

    if (!collectionId) {
      return NextResponse.json(
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : 1;

    // SDK-FIRST: Use authenticated SDK
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Note: SDK documents methods use projectId and collectionName, not collectionId
    // This route may need refactoring to match SDK API
    const sdk = await createAuthenticatedBackendSdk(authToken);
    // For now, we'll need projectId - this route structure may need adjustment
    // Assuming collectionId format or we need to extract projectId
    const documents = await (
      sdk.documents as unknown as {
        getAll: (
          projectId: string,
          collectionName: string,
          options?: { limit?: number; offset?: number }
        ) => Promise<unknown[]>;
      }
    ).getAll("", collectionId, {
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get documents",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const documentData = await request.json();

    // SDK 0.4.0+: Documents.create requires projectId and collectionName
    // Support both old format (collection_id) and new format (project_id + collection_name)
    if (!documentData.data) {
      return NextResponse.json(
        { success: false, error: "Document data is required" },
        { status: 400 }
      );
    }

    // Get projectId and collectionName from request
    const projectId = documentData.project_id || "";
    const collectionName =
      documentData.collection_name || documentData.collection_id || "";

    if (!collectionName) {
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    const sdk = await createAuthenticatedBackendSdk(authToken);

    // SDK 0.4.0+: Use documents.create() instead of collections.createDocument()
    const document = await sdk.documents.create(projectId, collectionName, {
      data: documentData.data,
      created_by: documentData.created_by,
    });

    return NextResponse.json(
      { success: true, data: document },
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
