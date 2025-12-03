import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Auth Change Password API Route
 *
 * POST /api/auth/change-password - Change user password
 * Forwards to backend /krapi/k1/auth/change-password
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

    const body = await request.json();

    if (!body.current_password || !body.new_password) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password and new password are required",
        },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    const sdk = await createAuthenticatedBackendSdk(authToken);
    const result = await sdk.auth.changePassword(body.current_password, body.new_password);

    return NextResponse.json({
      success: result.success !== false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Password change failed",
      },
      { status: 500 }
    );
  }
}
