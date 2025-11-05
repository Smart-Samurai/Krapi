/**
 * File Metadata API Route
 * GET /api/krapi/k1/storage/metadata/[fileId]
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const response = await fetch(`${backendUrl}/storage/metadata/${resolvedParams.fileId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to get file metadata" },
        { status: response.status }
      );
    }

    const metadataData = await response.json();
    return NextResponse.json(metadataData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to get file metadata" },
      { status: 500 }
    );
  }
}

