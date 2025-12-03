/**
 * Delete File API Route
 * DELETE /api/krapi/k1/storage/[fileId]
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { fileId } = resolvedParams;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // Note: SDK storage.delete may need projectId - this route structure may need adjustment
    const sdk = await createAuthenticatedBackendSdk(authToken);
    // For now, we'll need to extract projectId from fileId or metadata
    // This is a limitation - storage routes should include projectId
    await (sdk.storage as unknown as {
      delete: (fileId: string) => Promise<void>;
    }).delete(fileId);

    return NextResponse.json({ success: true });
  } catch {
    
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

