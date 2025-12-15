/**
 * Email Status API Route
 * GET /api/krapi/k1/email/status/[emailId]
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { emailId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id") || undefined;

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const status = await (sdk.email as unknown as {
      getStatus: (projectId: string, messageId: string) => Promise<Record<string, unknown>>;
    }).getStatus(projectId || "", emailId);

    return NextResponse.json(status);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting email status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get email status" },
      { status: 500 }
    );
  }
}

