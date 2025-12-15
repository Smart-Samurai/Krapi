/**
 * List Sent Emails API Route
 * GET /api/krapi/k1/email/sent
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
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const sentEmails = await (sdk.email as unknown as {
      getSent: (projectId?: string, options?: { limit?: number; offset?: number }) => Promise<unknown[]>;
    }).getSent(projectId, { limit, offset });

    return NextResponse.json(sentEmails);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error listing sent emails:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list sent emails" },
      { status: 500 }
    );
  }
}

