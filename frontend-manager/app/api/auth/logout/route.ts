import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Logout API Route
 *
 * POST /api/auth/logout - Logout and invalidate session
 * Forwards to backend /krapi/k1/auth/logout
 */

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    // Call backend directly for logout
    const response = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:3470"
      }/krapi/k1/auth/logout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.error || "Logout failed" },
        { status: response.status }
      );
    }

    const logoutResult = await response.json();
    return NextResponse.json(logoutResult);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
      },
      { status: 500 }
    );
  }
}
