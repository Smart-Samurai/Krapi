import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Refresh API Route
 *
 * POST /api/auth/refresh - Refresh session token
 * Forwards to backend /krapi/k1/auth/refresh
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

    // Call backend directly for session refresh
    const response = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:3470"
      }/krapi/k1/auth/refresh`,
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
        { success: false, error: errorData.error || "Session refresh failed" },
        { status: response.status }
      );
    }

    const refreshResult = await response.json();

    // Flatten the response to match what the tests expect
    if (refreshResult.success && refreshResult.data) {
      return NextResponse.json(refreshResult.data);
    } else {
      return NextResponse.json(refreshResult);
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Session refresh failed",
      },
      { status: 500 }
    );
  }
}
