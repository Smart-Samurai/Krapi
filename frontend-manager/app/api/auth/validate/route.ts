import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedBackendSdk } from "@/app/api/lib/backend-sdk-client";

/**
 * Auth Validate API Route
 *
 * POST /api/auth/validate - Validate session token
 *
 * SDK-FIRST: Uses krapi SDK instead of direct fetch calls
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    if (!body.token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // SDK-FIRST: Use backend SDK client (connects to backend URL)
    // SDK 0.4.0+: Use auth.validateSession() instead of validateToken()
    const sdk = await createAuthenticatedBackendSdk(body.token);
    const result = await sdk.auth.validateSession(body.token);

    // Response format: { valid: boolean, session?: {...} }
    if (result.valid && result.session) {
      return NextResponse.json({
        valid: true,
        session: result.session,
      });
    } else {
      return NextResponse.json({
        valid: false,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Session validation failed",
      },
      { status: 500 }
    );
  }
}
