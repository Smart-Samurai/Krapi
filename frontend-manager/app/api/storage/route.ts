import { NextRequest, NextResponse } from "next/server";

import { serverSdk } from "@/app/api/lib/sdk-client";

/**
 * Storage API Routes
 *
 * GET /api/storage - Get storage info and list files
 * POST /api/storage - Upload a file
 */

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get storage info using SDK
    const storageInfo = await serverSdk.storage.getStorageInfo(projectId);

    return NextResponse.json({ success: true, data: storageInfo });
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

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Handle file upload
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("project_id") as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { success: false, error: "File and project ID are required" },
        { status: 400 }
      );
    }

    // Upload file using SDK
    const fileInfo = await serverSdk.storage.uploadFile(projectId, file, {
      metadata: { uploaded_by: "admin" },
    });

    return NextResponse.json(
      { success: true, data: fileInfo },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
