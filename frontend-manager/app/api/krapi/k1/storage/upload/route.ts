/**
 * File Upload API Route
 * POST /api/krapi/k1/storage/upload
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("project_id") as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { success: false, error: "File and project ID are required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // SDK 0.4.0+: Use storage.uploadFile() instead of storage.upload()
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const folder = formData.get("folder") as string | undefined;
    const filename = formData.get("filename") as string | undefined;
    const fileInfo = await sdk.storage.uploadFile(projectId, file, {
      folder,
      filename,
      metadata: Object.fromEntries(formData.entries()) as Record<
        string,
        unknown
      >,
    });

    return NextResponse.json({ success: true, data: fileInfo });
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
