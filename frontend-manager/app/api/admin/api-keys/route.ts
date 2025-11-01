import { NextRequest, NextResponse } from "next/server";

/**
 * Admin API Keys API Route
 *
 * POST /api/admin/api-keys - Create new API key
 * Forwards to backend /krapi/k1/admin/api-keys
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
    const body = await request.json();

    // Call backend directly for API key creation
    const response = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:3470"
      }/krapi/k1/admin/api-keys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to create API key",
        },
        { status: response.status }
      );
    }

    const apiKeyData = await response.json();
    return NextResponse.json(apiKeyData);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create API key",
      },
      { status: 500 }
    );
  }
}
