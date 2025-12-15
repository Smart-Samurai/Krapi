/**
 * Auth Refresh Session API Route
 * POST /api/krapi/k1/auth/refresh
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

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
    const result = await sdk.auth.refreshSession();

    // SDK returns { session_token: string, expires_at: string } from backend
    // Frontend should return same format for SDK HTTP client
    // SDK HTTP client expects { success: true, data: { session_token, expires_at } }
    return NextResponse.json({
      success: true,
      data: {
        session_token: result.session_token,
        expires_at: result.expires_at,
      },
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

