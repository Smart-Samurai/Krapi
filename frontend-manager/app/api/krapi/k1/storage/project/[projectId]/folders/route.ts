/**
 * Storage Folders API Route
 * GET /api/krapi/k1/storage/project/[projectId]/folders
 * POST /api/krapi/k1/storage/project/[projectId]/folders
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
 * Get folders for a project
 * GET /api/krapi/k1/storage/project/[projectId]/folders
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const parentFolderId = searchParams.get("parent_folder_id") || undefined;
    const includeFiles = searchParams.get("include_files") === "true";

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const folders = await (sdk.storage as unknown as {
      listFolders: (projectId: string, options?: { parentFolderId?: string; includeFiles?: boolean }) => Promise<unknown[]>;
    }).listFolders(projectId, { parentFolderId, includeFiles });

    return NextResponse.json({
      success: true,
      folders: Array.isArray(folders) ? folders : [folders],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting folders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get folders",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a folder
 * POST /api/krapi/k1/storage/project/[projectId]/folders
 */
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

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const folder = await (sdk.storage as unknown as {
      createFolder: (projectId: string, name: string, options?: { parentFolderId?: string }) => Promise<Record<string, unknown>>;
    }).createFolder(projectId, body.name, { parentFolderId: body.parent_folder_id });

    return NextResponse.json({
      success: true,
      folder,
    }, { status: 201 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating folder:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create folder",
      },
      { status: 500 }
    );
  }
}

