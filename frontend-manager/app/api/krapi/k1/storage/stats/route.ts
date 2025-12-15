import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get storage stats
 * GET /api/krapi/k1/storage/stats
 * 
 * Note: This is a global stats endpoint. For project-specific stats,
 * use /api/krapi/k1/storage/project/[projectId]
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const storageService = sdk.storage as unknown as {
      getInfo: (projectId: string) => Promise<{
        total_files: number;
        total_size: number;
        storage_used_percentage: number;
        quota: number;
      }>;
    };

    const info = await storageService.getInfo(projectId);

    return NextResponse.json({
      success: true,
      data: info,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting storage stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get storage stats",
      },
      { status: 500 }
    );
  }
}

