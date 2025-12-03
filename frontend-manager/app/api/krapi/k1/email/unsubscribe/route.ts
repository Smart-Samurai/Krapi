/**
 * Email Unsubscribe API Route
 * POST /api/krapi/k1/email/unsubscribe
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await (sdk.email as unknown as {
      unsubscribe: (projectId: string, email: string) => Promise<{ success: boolean }>;
    }).unsubscribe(body.project_id || body.projectId, body.email || body.address);

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error handling email unsubscribe:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to handle email unsubscribe" },
      { status: 500 }
    );
  }
}

