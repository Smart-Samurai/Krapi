/**
 * Delete File API Route
 * DELETE /api/krapi/k1/storage/[fileId]
 */

import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3499";

export async function DELETE(
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
    const response = await fetch(`${backendUrl}/storage/${resolvedParams.fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to delete file" },
        { status: response.status }
      );
    }

    const deleteData = await response.json();
    return NextResponse.json(deleteData);
  } catch (error: unknown) {
    
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

