/**
 * Email Analytics API Route
 * GET /api/krapi/k1/email/analytics
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);
    const { searchParams } = new URL(request.url);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const projectId = searchParams.get("project_id") || undefined;
    const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : undefined;

    const analytics = await (sdk.email as unknown as {
      getAnalytics: (projectId?: string, options?: { days?: number }) => Promise<Record<string, unknown>>;
    }).getAnalytics(projectId, { days });

    return NextResponse.json(analytics);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting email analytics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get email analytics" },
      { status: 500 }
    );
  }
}

