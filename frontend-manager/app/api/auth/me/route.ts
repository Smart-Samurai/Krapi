import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Auth Me API Route
 *
 * GET /api/auth/me - Get current authenticated user
 * 
 * SDK-FIRST: Uses krapi SDK instead of direct fetch calls
 */

export async function GET(request: NextRequest): Promise<Response> {
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
    const result = await sdk.auth.getCurrentUser();

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to get user data",
        },
        { status: result.error ? 401 : 404 }
      );
    }

    // Response format: { success: true, user: {...} }
    return NextResponse.json({
      success: true,
      user: result.data,
      data: result.data, // Also include data for backward compatibility
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get user data",
      },
      { status: 500 }
    );
  }
}
