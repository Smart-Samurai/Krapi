import { NextRequest, NextResponse } from "next/server";

import { getClientSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * CLIENT ROUTE: Admin Login
 * 
 * POST /api/client/krapi/k1/auth/admin/login
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 * - Frontend GUI calls this client route
 * - Client route uses SDK (connects to frontend URL) to call proxy route
 * - Proxy route connects to backend
 * 
 * This avoids circular dependencies by separating client and proxy layers.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.username || !body.password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // CLIENT ROUTE: Use SDK to connect to frontend URL and call proxy route
    // This is like a 3rd party app using the SDK
    const clientSdk = await getClientSdkClient();

    // Use SDK to call the proxy route (which will connect to backend)
    // The SDK will make HTTP request to /api/krapi/k1/auth/admin/login
    const result = await clientSdk.auth.login(
      body.username,
      body.password,
      body.remember_me
    );

    // Return the result
    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.session_token,
        session_token: result.session_token,
        expires_at: result.expires_at,
        scopes: result.scopes || [],
      },
    });
  } catch (error) {
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

