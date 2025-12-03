import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Auth Logout API Route
 *
 * POST /api/auth/logout - Logout and invalidate session
 * 
 * SDK-FIRST: Uses krapi SDK instead of direct fetch calls
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.auth.logout();

    return NextResponse.json({
      success: result.success !== false,
      data: undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      },
      { status: 500 }
    );
  }
}
