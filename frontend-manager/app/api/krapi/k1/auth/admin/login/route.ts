import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * Admin Login API Route (SDK-compatible path)
 *
 * POST /api/krapi/k1/auth/admin/login - Admin user login
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.username || !body.password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // This avoids circular dependencies because it's a separate SDK instance
    const backendSdk = await getBackendSdkClient();

    // Use SDK auth.login method (verified: method exists, signature: login(username, password, remember_me?))
    // Returns: { session_token: string; user: AdminUser | ProjectUser; expires_at: string; scopes: string[] }
    const result = await backendSdk.auth.login(
      body.username,
      body.password,
      body.remember_me
    );

    // SDK expects response wrapped in 'data' property with 'token' field (not 'session_token')
    // The SDK's auth adapter looks for: response.data.token, response.data.user, response.data.expires_at, response.data.scopes
    return NextResponse.json({
      success: true,
      data: {
        token: result.session_token,
      user: result.user,
      expires_at: result.expires_at,
      scopes: result.scopes || [],
      },
    });
  } catch (error) {
    // SDK errors are properly formatted
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    const statusCode = (error as { status?: number })?.status || 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
