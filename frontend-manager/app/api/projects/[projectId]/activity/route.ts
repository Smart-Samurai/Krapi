import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

// UUID validation function - more permissive to accept any valid UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get project activity
 * GET /api/projects/[projectId]/activity
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;
    const days = searchParams.get("days")
      ? parseInt(searchParams.get("days")!)
      : undefined;
    const action_type = searchParams.get("action_type") || undefined;

    // SDK 0.4.0+: getActivity uses start_date/end_date instead of days
    // Calculate start_date from days if provided
    let start_date: string | undefined;
    if (days) {
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - days);
      start_date = startDateObj.toISOString();
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const activity = await sdk.projects.getActivity(projectId, {
      limit,
      offset,
      action_type,
      start_date,
    });

    // SDK returns activity object or array
    // Format response to match expected format
    const activities = Array.isArray(activity)
      ? activity
      : typeof activity === "object" &&
        activity !== null &&
        "activities" in activity
      ? (activity as { activities: unknown[] }).activities
      : [];
    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch project activity",
      },
      { status: 500 }
    );
  }
}
