/**
 * Email Bounces API Route
 * GET /api/krapi/k1/email/bounces
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

    const bounces = await (sdk.email as unknown as {
      getBounces: (projectId?: string) => Promise<unknown[]>;
    }).getBounces(projectId);

    return NextResponse.json(bounces);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting email bounces:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get email bounces" },
      { status: 500 }
    );
  }
}

