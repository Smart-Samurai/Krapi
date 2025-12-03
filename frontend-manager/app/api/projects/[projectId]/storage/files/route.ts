/**
 * List Files in Project Storage API Route
 * GET /api/projects/[projectId]/storage/files
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Disable static generation for this dynamic route
export function generateStaticParams() {
  return [];
}

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get files for a project
 * GET /api/projects/[projectId]/storage/files
 */
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

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // Use storage.listFiles method if available
    const storageService = sdk.storage as unknown as {
      listFiles: (projectId: string, options?: { folder?: string; limit?: number; offset?: number }) => Promise<unknown[]>;
    };
    
    const files = await storageService.listFiles(projectId, {});

    return NextResponse.json({
      success: true,
      files: Array.isArray(files) ? files : [],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting files:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get files",
      },
      { status: 500 }
    );
  }
}

