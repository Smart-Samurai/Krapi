import { NextRequest, NextResponse } from "next/server";

import { getBackendSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * PROXY ROUTE: Admin Login
 *
 * POST /api/krapi/k1/auth/admin/login - Admin user login
 *
 * ARCHITECTURE: Proxy route that connects directly to backend
 * - Called by client routes (via SDK) or external apps
 * - Connects to BACKEND URL (port 3470) directly
 * - Proxies requests to backend server
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

export async function POST(request: NextRequest): Promise<Response> {
  // eslint-disable-next-line no-console
  console.log("[FRONTEND] /api/krapi/k1/auth/admin/login called");
  try {
    const body = await request.json();
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] Admin login request body:", { username: body.username, hasPassword: !!body.password });

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

    // eslint-disable-next-line no-console
    console.log("[FRONTEND] Backend SDK login result:", { hasSessionToken: !!result?.session_token, hasUser: !!result?.user, keys: result ? Object.keys(result) : [] });

    // SDK client mode expects response wrapped in { success: true, data: {...} } format (same as backend)
    // The SDK will unwrap the data field and return { session_token, user, expires_at, scopes }
    // Backend returns: { success: true, data: { user, token, session_token, expires_at, scopes } }
    const response = {
      success: true,
      data: {
        user: result.user,
        token: result.session_token,
      session_token: result.session_token,
      expires_at: result.expires_at,
      scopes: result.scopes || [],
      },
    };
    // eslint-disable-next-line no-console
    console.log("[FRONTEND] Returning admin login response:", JSON.stringify(response).substring(0, 200));
    return NextResponse.json(response);
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
