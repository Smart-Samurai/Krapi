/**
 * Get User Activity API Route
 * GET /api/krapi/k1/projects/[projectId]/users/[userId]/activity
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
    params: Promise<{ projectId: string; userId: string }>;
  }
): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId, userId } = await params;

    if (!projectId || !userId) {
      return NextResponse.json(
        { success: false, error: "Project ID and user ID are required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : undefined;
    const startDate = searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("end_date") || undefined;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK users.getActivity() method
    const activity = await backendSdk.users.getActivity(projectId, userId, {
      limit,
      offset,
      start_date: startDate,
      end_date: endDate,
    });

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user activity",
      },
      { status: 500 }
    );
  }
}



