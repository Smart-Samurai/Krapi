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
 * Get files in a project's storage
 * GET /api/krapi/k1/projects/[projectId]/storage/files
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

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const options: {
      folder?: string;
      limit?: number;
      offset?: number;
      search?: string;
      type?: string;
    } = {};

    if (searchParams.get("folder_id")) options.folder = searchParams.get("folder_id") || undefined;
    if (searchParams.get("limit")) options.limit = parseInt(searchParams.get("limit") || "100", 10);
    if (searchParams.get("offset")) options.offset = parseInt(searchParams.get("offset") || "0", 10);
    if (searchParams.get("search")) options.search = searchParams.get("search") || undefined;
    if (searchParams.get("mime_type")) options.type = searchParams.get("mime_type") || undefined;

    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // Use SDK storage.getFiles() method - let errors propagate so tests can catch them
    const files = await sdk.storage.getFiles(projectId, options);

    // SDK HTTP client expects response.data to be the files array
    return NextResponse.json({
      success: true,
      data: Array.isArray(files) ? files : [],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get files";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

