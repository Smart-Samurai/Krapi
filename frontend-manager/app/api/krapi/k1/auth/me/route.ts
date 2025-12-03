import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";

/**
 * Auth Me API Route (SDK-compatible path)
 *
 * GET /api/krapi/k1/auth/me - Get current authenticated user
 *
 * SDK-FIRST ARCHITECTURE: Uses backend SDK client to communicate with backend.
 * NO direct fetch calls allowed - all communication goes through SDK.
 */

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const authToken = authHeader.substring(7); // Remove "Bearer " prefix

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization token required" },
        { status: 401 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // This avoids circular dependencies because it's a separate SDK instance
    // CRITICAL: Set session token right before making the request to avoid
    // concurrency issues with the singleton SDK
    let backendSdk;
    try {
      backendSdk = await createAuthenticatedBackendSdk(authToken);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ [AUTH ME] Failed to create authenticated backend SDK:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to authenticate",
        },
        { status: 500 }
      );
    }

    // Use SDK auth.getCurrentUser method (verified: method exists, returns { success, data?, error? })
    // The SDK's HTTP client interceptor checks `this.sessionToken || this.apiKey` on each request,
    // so the session token should be used if it's set
    let result;
    try {
      result = await backendSdk.auth.getCurrentUser();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ [AUTH ME] Failed to get current user from SDK:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
        errorCode: (error as { code?: string })?.code,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get user data",
        },
        { status: 500 }
      );
    }

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to get user data",
        },
        { status: 401 }
      );
    }

    // Return response in SDK-compatible format
    // Backend SDK's getCurrentUser (client mode) returns: { success: true, data: userObject }
    // But the HTTP endpoint expects Session format: { success: true, data: { user: userObject } }
    // So we need to check: if result.data is already a user object, wrap it; if it's { user: ... }, return as-is
    const userData = result.data;
    if (userData && typeof userData === "object" && "user" in userData) {
      // Already in session format
      return NextResponse.json({
        success: true,
        data: userData,
      });
    } else {
      // User object directly, need to wrap in session format
    return NextResponse.json({
      success: true,
        data: {
          user: userData,
        },
    });
    }
  } catch (error) {
    // SDK errors are properly formatted
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get user data";
    const statusCode = (error as { status?: number })?.status || 500;

    // eslint-disable-next-line no-console
    console.error("Error in /api/krapi/k1/auth/me:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
