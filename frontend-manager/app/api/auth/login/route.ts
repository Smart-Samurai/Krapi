import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Login API Route
 *
 * POST /api/auth/login - User login
 * Forwards to backend /krapi/k1/auth/admin/login
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

    // Call backend directly for admin login
    const response = await fetch(
      `${
        process.env.KRAPI_BACKEND_URL || "http://localhost:3470"
      }/krapi/k1/auth/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: body.username,
          password: body.password,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || "Authentication failed" },
        { status: response.status }
      );
    }

    const session = await response.json();

    // Flatten the response to match what the tests expect
    return NextResponse.json({
      success: session.success,
      session_token: session.data.session_token,
      user: session.data.user,
      expires_at: session.data.expires_at,
      scopes: session.data.user.scopes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 500 }
    );
  }
}
