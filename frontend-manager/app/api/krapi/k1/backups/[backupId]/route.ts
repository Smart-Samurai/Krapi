/**
 * Delete Backup API Route
 * DELETE /api/krapi/k1/backups/[backupId]
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ backupId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { backupId } = await params;
    const backendUrl = process.env.KRAPI_BACKEND_URL || "http://localhost:3470";

    const response = await fetch(
      `${backendUrl}/krapi/k1/backups/${backupId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to delete backup",
        },
        { status: response.status }
      );
    }

    const deleteData = await response.json();
    return NextResponse.json(deleteData);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete backup",
      },
      { status: 500 }
    );
  }
}
