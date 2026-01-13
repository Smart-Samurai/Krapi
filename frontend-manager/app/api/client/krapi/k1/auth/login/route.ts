import { NextRequest, NextResponse } from "next/server";

import { getClientSdkClient } from "@/app/api/lib/backend-sdk-client";

/**
 * CLIENT ROUTE: Login
 * 
 * POST /api/client/krapi/k1/auth/login
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
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
    const clientSdk = await getClientSdkClient();

    // Use SDK to call the proxy route
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










