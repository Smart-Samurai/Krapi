import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Validate API Route
 *
 * POST /api/auth/validate - Validate session token
 * Forwards to backend /krapi/k1/auth/session/validate
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

    // Call backend directly for session validation
    const response = await fetch(
      `${
        process.env.KRAPI_BACKEND_URL || "http://localhost:3470"
      }/krapi/k1/auth/session/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: body.token,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Session validation failed",
        },
        { status: response.status }
      );
    }

    const validationResult = await response.json();

    // Flatten the response to match what the tests expect
    if (validationResult.success && validationResult.data) {
      return NextResponse.json(validationResult.data);
    } else {
      return NextResponse.json(validationResult);
    }
  } catch {
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
