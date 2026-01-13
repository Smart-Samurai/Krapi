import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Delete test project
 * DELETE /api/testing/project/[projectId]
 *
 * PROXY ROUTE: Connects to backend URL for testing operations
 * SDK 0.4.0+: Use testing.cleanup(projectId) instead of testing.deleteTestProject()
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const backendSdk = await getBackendSdkClient();
    // SDK 0.4.0+: Use cleanup(projectId) instead of deleteTestProject()
    const result = await backendSdk.testing.cleanup(projectId);
    return NextResponse.json({
      success: result.success,
      deleted: result.deleted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
