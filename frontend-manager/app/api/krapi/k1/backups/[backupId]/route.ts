/**
 * Delete Backup API Route
 * DELETE /api/krapi/k1/backups/[backupId]
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
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

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // SDK 0.4.0+: Use backup.delete() instead of backups
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.backup.delete(backupId);

    // SDK adapter now properly handles the response (fixed double unwrapping issue)
    // It checks for "success" in response and returns { success: response.success }
    // Return the result from the SDK
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete backup",
      },
      { status: 500 }
    );
  }
}
