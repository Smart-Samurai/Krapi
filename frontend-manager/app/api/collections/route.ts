import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

/**
 * Collections API Routes
 *
 * GET /api/collections - Get all collections for a project
 * POST /api/collections - Create a new collection
 */

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get collections for the project using SDK
    const collections = await serverSdk.collections.getCollectionsByProject(
      projectId
    );

    return NextResponse.json({ success: true, data: collections });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get collections",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const collectionData = await request.json();

    if (!collectionData.project_id || !collectionData.name) {
      return NextResponse.json(
        { success: false, error: "Project ID and name are required" },
        { status: 400 }
      );
    }

    // Create collection using SDK
    // SDK expects: collections.create(projectId, collectionData)
    const collection = await serverSdk.collections.create(
      collectionData.project_id,
      {
        name: collectionData.name,
        description: collectionData.description || "",
        fields: collectionData.fields || [],
        indexes: collectionData.indexes || [],
      }
    );

    return NextResponse.json(
      { success: true, data: collection },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create collection",
      },
      { status: 500 }
    );
  }
}
