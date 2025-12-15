/**
 * Upload File API Route
 * POST /api/krapi/k1/projects/[projectId]/storage/upload
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Upload a file to project storage
 * POST /api/krapi/k1/projects/[projectId]/storage/upload
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
): Promise<Response> {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // Get form data (file upload)
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL via HTTP)
    // The SDK HTTP client expects File/Blob object, not Buffer
    const sdk = await createAuthenticatedBackendSdk(authToken);
    
    // SDK HTTP client uploadFile signature: uploadFile(projectId, file, options?)
    // where file is File or Blob, and options can include metadata
    const result = await sdk.storage.uploadFile(projectId, file, {
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // SDK returns FileRecord object
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}

