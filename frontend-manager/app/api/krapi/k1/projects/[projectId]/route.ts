import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function generateStaticParams() {
  return [];
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get a specific project
 * GET /api/krapi/k1/projects/[projectId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const project = await sdk.projects.get(projectId);

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: `Project '${projectId}' not found`,
        },
        { status: 404 }
      );
    }

    // Return project directly (tests expect result.id or result.data.id)
    // Also wrap in success format for SDK compatibility
    return NextResponse.json({
      success: true,
      ...project, // Spread project properties at top level
      project, // Also include in project field
      data: project, // Also include in data field for SDK compatibility
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching project:", error);
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
 * PUT /api/krapi/k1/projects/[projectId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const updates = await request.json();

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const normalizedUpdates: Record<string, unknown> = { ...updates };
    if ("active" in normalizedUpdates && !("is_active" in normalizedUpdates)) {
      normalizedUpdates.is_active = normalizedUpdates.active;
      delete normalizedUpdates.active;
    }

    const authenticatedSdk = await createAuthenticatedBackendSdk(authToken);
    const result = await authenticatedSdk.projects.update(
      projectId,
      normalizedUpdates
    );

    // Backend returns { success: true, data: project }
    // SDK adapter expects response.data to be the Project
    // Return backend response format: { success: true, data: project }
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating project:", error);
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
 * DELETE /api/krapi/k1/projects/[projectId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const authenticatedSdk = await createAuthenticatedBackendSdk(authToken);
    await authenticatedSdk.projects.delete(projectId);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
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

