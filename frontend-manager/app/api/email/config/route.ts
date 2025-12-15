import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get email configuration
 * GET /api/email/config
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const sdk = await createAuthenticatedBackendSdk(authToken);
    const settings = await sdk.system.getSettings();
    const config = (settings as { email?: unknown })?.email || {};

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error getting email config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get email configuration",
      },
      { status: 500 }
    );
  }
}

