import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Logout (Legacy /api/auth/logout)
 * 
 * POST /api/client/auth/logout
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    // CLIENT ROUTE: Use SDK to connect to frontend URL and call proxy route
    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const result = await clientSdk.auth.logout();

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










