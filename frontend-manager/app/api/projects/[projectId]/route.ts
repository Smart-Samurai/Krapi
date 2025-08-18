import { NextRequest, NextResponse } from "next/server";
import { krapi } from "@krapi/sdk";

/**
 * Get a specific project
 * GET /api/projects/[projectId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const { projectId } = await params;
    const project = await krapi.projects.get(projectId);
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get project",
      },
      { status: 500 }
    );
  }
}

/**
 * Update a project
 * PUT /api/projects/[projectId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const { projectId } = await params;
    const updates = await request.json();
    const project = await krapi.projects.update(projectId, updates);
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update project",
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a project
 * DELETE /api/projects/[projectId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const { projectId } = await params;
    const result = await krapi.projects.delete(projectId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete project",
      },
      { status: 500 }
    );
  }
}
