/**
 * Get File URL API Route
 * GET /api/krapi/k1/projects/[projectId]/storage/files/[fileId]/url
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; fileId: string }>;
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

    const { projectId, fileId } = await params;

    if (!projectId || !fileId) {
      return NextResponse.json(
        { success: false, error: "Project ID and file ID are required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const expiresIn = searchParams.get("expires_in")
      ? parseInt(searchParams.get("expires_in")!, 10)
      : undefined;
    const download = searchParams.get("download") === "true";

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK storage.getFileUrl() method
    const result = await backendSdk.storage.getFileUrl(projectId, fileId, {
      expires_in: expiresIn,
      download,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get file URL",
      },
      { status: 500 }
    );
  }
}



