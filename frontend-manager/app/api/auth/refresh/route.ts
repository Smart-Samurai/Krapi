import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Auth Refresh API Route
 *
 * POST /api/auth/refresh - Refresh session token
 * Forwards to backend /krapi/k1/auth/refresh
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const authToken = getAuthToken(request.headers);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // SDK 0.4.0+: Use auth.refreshSession() instead of refreshToken()
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.auth.refreshSession();

    // SDK returns { session_token: string, expires_at: string }
    return NextResponse.json({
      success: true,
      session_token: result.session_token,
      expires_at: result.expires_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Session refresh failed",
      },
      { status: 500 }
    );
  }
}
