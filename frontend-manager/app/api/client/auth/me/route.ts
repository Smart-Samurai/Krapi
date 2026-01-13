import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * CLIENT ROUTE: Get Current User (Legacy /api/auth/me)
 * 
 * GET /api/client/auth/me
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
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
    const result = await clientSdk.auth.getCurrentUser();

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to get user data",
        },
        { status: result.error ? 401 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.data,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user data",
      },
      { status: 500 }
    );
  }
}










