import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Delete test project
 * DELETE /api/testing/project/[projectId]
 *
 * SDK 0.4.0+: Use testing.cleanup(projectId) instead of testing.deleteTestProject()
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    // SDK 0.4.0+: Use cleanup(projectId) instead of deleteTestProject()
    const result = await krapi.testing.cleanup(projectId);
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
