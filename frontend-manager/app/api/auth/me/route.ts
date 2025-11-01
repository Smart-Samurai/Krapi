import { NextRequest, NextResponse } from "next/server";

/**
 * Auth Me API Route
 *
 * GET /api/auth/me - Get current authenticated user
 * Forwards to backend /krapi/k1/auth/me
 */

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    // Call backend directly for get current user with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(
        `${
          process.env.KRAPI_BACKEND_URL || "http://localhost:3470"
        }/krapi/k1/auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          {
            success: false,
            error: errorData.error || "Failed to get user data",
          },
          { status: response.status }
        );
      }

      const userData = await response.json();

      // Flatten the response to match what the tests expect
      if (userData.success && userData.data) {
        return NextResponse.json(userData.data);
      } else {
        return NextResponse.json(userData);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Request timeout - backend took too long to respond",
          },
          { status: 408 }
        );
      }
      throw fetchError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get user data",
      },
      { status: 500 }
    );
  }
}
