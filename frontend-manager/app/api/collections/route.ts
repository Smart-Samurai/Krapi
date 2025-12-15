import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

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

    // SDK-FIRST: Use authenticated SDK
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const collections = await sdk.collections.getAll(projectId);

    return NextResponse.json({ success: true, data: collections });
  } catch (error) {
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

    // SDK-FIRST: Use authenticated SDK
    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const collection = await sdk.collections.create(
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
  } catch (error) {
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
