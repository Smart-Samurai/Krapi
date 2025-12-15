/**
 * Get Storage Info API Route
 * GET /api/projects/[projectId]/storage/info
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // Type assertion needed as SDK types may not be fully updated
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const storageService = sdk.storage as unknown as {
      getInfo: (projectId: string) => Promise<{
        total_files: number;
        total_size: number;
        storage_used_percentage: number;
        quota: number;
      }>;
    };
    const storageInfo = await storageService.getInfo(projectId);

    // SDK returns storage info object
    return NextResponse.json({
      success: true,
      data: storageInfo,
    });
  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get storage info",
      },
      { status: 500 }
    );
  }
}

