import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Disable static generation for this dynamic route
export function generateStaticParams() {
  return [];
}

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get project settings
 * GET /api/projects/[projectId]/settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const settings = await sdk.projects.getSettings(projectId);

    // SDK returns settings object directly
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching project settings:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch project settings",
      },
      { status: 500 }
    );
  }
}

/**
 * Update project settings
 * PUT /api/projects/[projectId]/settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const updates = await request.json();

    // Validate UUID format before making backend call
    if (!isValidUUID(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);

    // Get current settings to merge
    let currentSettings = {};
    try {
      currentSettings = await sdk.projects.getSettings(projectId);
    } catch (_err) {
      // Ignore errors when fetching current settings
    }

    // Merge current settings with updates
    const mergedSettings = {
      ...(typeof currentSettings === "object" && currentSettings !== null
        ? currentSettings
        : {}),
      ...updates,
    };

    // Update settings using SDK
    const updatedSettings = await sdk.projects.updateSettings(
      projectId,
      mergedSettings
    );

    // SDK returns updated settings
    return NextResponse.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update project settings",
      },
      { status: 500 }
    );
  }
}
