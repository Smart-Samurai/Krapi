import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Collections
 * 
 * GET /api/client/krapi/k1/projects/[projectId]/collections - Get all collections
 * POST /api/client/krapi/k1/projects/[projectId]/collections - Create collection
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
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const collections = await clientSdk.collections.getAll(projectId);

    return NextResponse.json({
      success: true,
      collections: Array.isArray(collections) ? collections : [collections],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch collections";
    
    // Check for permission errors
    if (
      errorMessage.toLowerCase().includes("insufficient permissions") ||
      errorMessage.toLowerCase().includes("permission denied") ||
      errorMessage.toLowerCase().includes("forbidden") ||
      (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 403) ||
      (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "FORBIDDEN")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const collectionData = await request.json();

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const collection = await clientSdk.collections.create(projectId, collectionData);

    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create collection",
      },
      { status: 500 }
    );
  }
}








