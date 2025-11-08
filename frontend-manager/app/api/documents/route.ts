import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

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

    // Get documents from collection using SDK
    const documents = await serverSdk.collections.getDocuments(collectionId, {
      limit,
      page,
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

    if (!documentData.collection_id || !documentData.data) {
      return NextResponse.json(
        { success: false, error: "Collection ID and data are required" },
        { status: 400 }
      );
    }

    // Create document using SDK
    const document = await serverSdk.collections.createDocument(
      documentData.collection_id,
      documentData.data
    );

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
