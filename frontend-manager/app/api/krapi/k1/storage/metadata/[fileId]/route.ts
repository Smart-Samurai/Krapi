/**
 * File Metadata API Route
 * GET /api/krapi/k1/storage/metadata/[fileId]
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
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
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const metadata = await (sdk.storage as unknown as {
      getMetadata: (fileId: string) => Promise<Record<string, unknown>>;
    }).getMetadata(fileId);

    return NextResponse.json(metadata);
  } catch {
    
    return NextResponse.json(
      { error: "Failed to get file metadata" },
      { status: 500 }
    );
  }
}

