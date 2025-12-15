/**
 * Storage Folder API Route
 * DELETE /api/krapi/k1/storage/project/[projectId]/folders/[folderId]
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
 * Delete a folder
 * DELETE /api/krapi/k1/storage/project/[projectId]/folders/[folderId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; folderId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId, folderId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    if (!isValidUUID(folderId)) {
      return NextResponse.json(
        { success: false, error: "Invalid folder ID format" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    await (sdk.storage as unknown as {
      deleteFolder: (projectId: string, folderId: string) => Promise<void>;
    }).deleteFolder(projectId, folderId);

    return NextResponse.json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete folder",
      },
      { status: 500 }
    );
  }
}

