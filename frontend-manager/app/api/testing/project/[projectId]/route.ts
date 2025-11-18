import { krapi } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Delete test project
 * DELETE /api/testing/project/[projectId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    await krapi.testing.deleteTestProject(projectId);
    return NextResponse.json({
      success: true,
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

