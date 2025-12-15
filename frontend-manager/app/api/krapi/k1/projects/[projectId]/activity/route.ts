/**
 * Project Activity API Route
 * GET /api/krapi/k1/projects/[projectId]/activity
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
): Promise<Response> {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      );
    }

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const days = searchParams.get("days");

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const activityOptions: { limit?: number; days?: number } = {};
    if (limit) {
      activityOptions.limit = parseInt(limit, 10);
    }
    if (days) {
      activityOptions.days = parseInt(days, 10);
    }

    const activity = await sdk.projects.getActivity(projectId, activityOptions);

    // SDK returns activity array or object with activities
    // The SDK adapter expects an array directly for projects.getActivity()
    const activities = Array.isArray(activity)
      ? activity
      : typeof activity === "object" &&
        activity !== null &&
        "activities" in activity
      ? (activity as { activities: unknown[] }).activities
      : typeof activity === "object" &&
        activity !== null &&
        "data" in activity &&
        typeof (activity as { data: unknown }).data === "object" &&
        (activity as { data: unknown }).data !== null &&
        "activities" in (activity as { data: { activities?: unknown[] } })
      ? ((activity as { data: { activities: unknown[] } }).data.activities)
      : [];

    // Return activities array directly - SDK adapter will handle it
    // This matches the expected format for projects.getActivity()
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

