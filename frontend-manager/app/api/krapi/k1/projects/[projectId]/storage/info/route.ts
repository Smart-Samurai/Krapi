import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get storage information for a project
 * GET /api/krapi/k1/projects/[projectId]/storage/info
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
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

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // Use SDK storage.getFiles() method - let errors propagate so tests can catch them
    const files = await sdk.storage.getFiles(projectId);
    
    const totalFiles = files.length;
    // FileInfo has size property
    const totalSize = files.reduce((sum: number, file: { size?: number }) => sum + (file.size || 0), 0);
    
    // Default quota (can be configured per project)
    const defaultQuota = 10 * 1024 * 1024 * 1024; // 10GB
    const quota = defaultQuota;
    const storageUsedPercentage = quota > 0 ? (totalSize / quota) * 100 : 0;
    
    // Transform to match HTTP client's expected format
    const storageInfo = {
      total_files: totalFiles,
      total_size: totalSize,
      storage_used_percentage: storageUsedPercentage,
      quota,
    };

    // SDK HTTP client expects response.data to be the storage info
    return NextResponse.json({
      success: true,
      data: storageInfo,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get storage info";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

