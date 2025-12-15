/**
 * Activity Statistics API Route
 * GET /api/krapi/k1/activity/stats
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id") || undefined;
    const days = searchParams.get("days")
      ? parseInt(searchParams.get("days")!)
      : undefined;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const backendSdk = await createAuthenticatedBackendSdk(authToken);

    // Use SDK activity.getStats method (client mode uses HTTP, server mode uses direct DB)
    // Signature: getStats(projectId?: string, days?: number)
    const stats = await backendSdk.activity.getStats(projectId, days);

    return NextResponse.json({
      success: true,
      ...(stats || {}),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting activity statistics:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to get activity statistics";
    const statusCode = (error as { status?: number })?.status || 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
